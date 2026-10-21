#!/usr/bin/env python3
"""Firefox Native Messaging host for Vexora ESC/POS printers."""

from __future__ import annotations

import json
import re
import struct
import sys
from pathlib import Path
from typing import Any, BinaryIO, Callable

MAX_MESSAGE_BYTES = 512 * 1024
MAX_PRODUCTS = 250
MAX_ROWS = 40


def read_exact(stream: BinaryIO, size: int) -> bytes:
    chunks = bytearray()
    while len(chunks) < size:
        chunk = stream.read(size - len(chunks))
        if not chunk:
            raise EOFError("Mensaje Native Messaging incompleto.")
        chunks.extend(chunk)
    return bytes(chunks)


def read_message(stream: BinaryIO) -> dict[str, Any] | None:
    header = stream.read(4)
    if not header:
        return None
    if len(header) != 4:
        raise ValueError("Cabecera Native Messaging incompleta.")

    message_size = struct.unpack("<I", header)[0]
    if message_size == 0 or message_size > MAX_MESSAGE_BYTES:
        raise ValueError("El mensaje excede el tamaño permitido.")

    message = json.loads(read_exact(stream, message_size).decode("utf-8"))
    if not isinstance(message, dict):
        raise ValueError("El mensaje debe ser un objeto JSON.")
    return message


def write_message(stream: BinaryIO, message: dict[str, Any]) -> None:
    payload = json.dumps(message, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    stream.write(struct.pack("<I", len(payload)))
    stream.write(payload)
    stream.flush()


def safe_text(value: Any, limit: int = 240) -> str:
    text = str(value if value is not None else "")
    text = "".join(character for character in text if character in "\n\t" or ord(character) >= 32)
    return text[:limit]


def money(value: Any) -> str:
    if isinstance(value, bool):
        return safe_text(value)
    if isinstance(value, (int, float)):
        amount = int(round(value))
        sign = "-" if amount < 0 else ""
        return f"{sign}${abs(amount):,}".replace(",", ".")
    return safe_text(value)


def host_directory() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent


def load_config() -> dict[str, Any]:
    config_path = host_directory() / "config.json"
    try:
        config = json.loads(config_path.read_text(encoding="utf-8"))
    except FileNotFoundError as error:
        raise RuntimeError(f"Falta configurar {config_path}.") from error
    except json.JSONDecodeError as error:
        raise RuntimeError("config.json no contiene JSON válido.") from error

    if not isinstance(config, dict):
        raise RuntimeError("La configuración de impresora debe ser un objeto JSON.")
    return config


def parse_usb_id(value: Any, name: str) -> int:
    try:
        parsed = int(value, 0) if isinstance(value, str) else int(value)
    except (TypeError, ValueError) as error:
        raise RuntimeError(f"Configura {name} con un ID USB válido, por ejemplo 0x04b8.") from error
    if not 1 <= parsed <= 0xFFFF:
        raise RuntimeError(f"Configura {name} con un ID entre 1 y 65535.")
    return parsed


def print_ticket(
    target: Any,
    ticket: Any,
    config: dict[str, Any] | None = None,
    printer_factory: Callable[..., Any] | None = None,
) -> None:
    if target not in {"caja", "cocina"}:
        raise ValueError("El destino debe ser caja o cocina.")
    if not isinstance(ticket, dict):
        raise ValueError("El ticket debe ser un objeto JSON.")

    settings = config if config is not None else load_config()
    vendor_id = parse_usb_id(settings.get("vendor_id"), "vendor_id")
    product_id = parse_usb_id(settings.get("product_id"), "product_id")
    interface = int(settings.get("interface", 0))
    if not 0 <= interface <= 255:
        raise RuntimeError("interface debe estar entre 0 y 255.")

    if printer_factory is None:
        from escpos.printer import Usb

        printer_factory = Usb

    printer = printer_factory(vendor_id, product_id, interface=interface)
    try:
        render_ticket(printer, ticket, target)
        printer.cut()
    finally:
        printer.close()


def render_ticket(printer: Any, ticket: dict[str, Any], target: str) -> None:
    business = ticket.get("negocio") if isinstance(ticket.get("negocio"), dict) else {}
    printer.set(align="center", bold=True)
    printer.text(safe_text(business.get("nombre") or "VEXORA POS", 120) + "\n")
    printer.set(bold=False)
    if business.get("nit"):
        printer.text("NIT: " + safe_text(business["nit"]) + "\n")
    if business.get("direccion"):
        printer.text(safe_text(business["direccion"]) + "\n")

    printer.text("--------------------------------\n")
    if ticket.get("copy") is True:
        printer.set(align="center", bold=True)
        printer.text("*** COPIA ***\n")
        printer.set(align="left", bold=False)
    printer.set(align="left")
    if target == "cocina":
        printer.set(align="center", bold=True)
        printer.text("COMANDA · " + safe_text(ticket.get("numero") or "Cocina") + "\n")
        printer.set(align="left", bold=False)
        _print_products(printer, ticket)
    elif ticket.get("tipo") == "CIERRE":
        printer.set(align="center", bold=True)
        printer.text("CIERRE DE CAJA\n")
        printer.set(align="left", bold=False)
        for row in _limited_list(ticket.get("resumen"), MAX_ROWS):
            if isinstance(row, dict):
                printer.text(safe_text(row.get("label"), 120) + ": " + safe_text(row.get("valor")) + "\n")
        printer.text("--------------------------------\nDESGLOSE DE EFECTIVO\n")
        for row in _limited_list(ticket.get("desglose"), MAX_ROWS):
            if isinstance(row, dict):
                label = safe_text(row.get("label"), 40)
                quantity = safe_text(row.get("cantidad"), 12)
                total = safe_text(row.get("total"), 40)
                printer.text(f"{label} x {quantity}  {total}\n")
        printer.text("--------------------------------\n")
        printer.set(align="center", bold=True)
        printer.text(safe_text(ticket.get("resultado") or "CIERRE", 80) + "\n")
        printer.set(align="left", bold=False)
    else:
        printer.text("Factura: " + safe_text(ticket.get("numero") or "Venta") + "\n")
        customer = ticket.get("cliente") if isinstance(ticket.get("cliente"), dict) else {}
        printer.text("Cliente: " + safe_text(customer.get("nombre") or "Cliente Final") + "\n")
        _print_products(printer, ticket)
        printer.text("--------------------------------\n")
        if ticket.get("total") is not None:
            printer.set(align="right", bold=True)
            printer.text("TOTAL: " + money(ticket["total"]) + "\n")
        if ticket.get("paymentMethod"):
            printer.set(align="left", bold=False)
            printer.text("Pago: " + safe_text(ticket["paymentMethod"], 80) + "\n")
        if ticket.get("cashReceived") is not None:
            printer.set(align="left", bold=False)
            printer.text("Recibido: " + money(ticket["cashReceived"]) + "\n")
            printer.text("Devuelta: " + money(ticket.get("changeDue", 0)) + "\n")

    if target == "caja":
        if ticket.get("tipoCodigo") == "BARCODE":
            barcode = "".join(character for character in str(ticket.get("barcode12") or "") if character.isdigit())
            if re.fullmatch(r"\d{12}", barcode):
                printer.barcode(barcode, "CODE128", height=54, width=2, pos="BELOW")
            else:
                printer.text("Falta el consecutivo de 12 digitos para el codigo de barras.\n")
        else:
            qr_value = safe_text(ticket.get("qrValue") or ticket.get("qrUrl"), 512)
            if qr_value:
                printer.qr(qr_value, size=6, model=2, center=True)

    footer = business.get("mensajeTicket") or "Gracias por su compra"
    printer.set(align="center", bold=False)
    printer.text(safe_text(footer, 240) + "\nVexoraIA POS\n")


def _limited_list(value: Any, limit: int) -> list[Any]:
    return value[:limit] if isinstance(value, list) else []


def _print_products(printer: Any, ticket: dict[str, Any]) -> None:
    for product in _limited_list(ticket.get("productos"), MAX_PRODUCTS):
        if not isinstance(product, dict):
            continue
        quantity = safe_text(product.get("cantidad"), 12)
        name = safe_text(product.get("nombre"), 120)
        line = f"x{quantity} {name}"
        if product.get("total") is not None:
            line += "  " + money(product["total"])
        printer.text(line + "\n")
        if product.get("nota"):
            printer.text("  Nota: " + safe_text(product["nota"], 200) + "\n")


def dispatch_message(
    message: dict[str, Any],
    printer_factory: Callable[..., Any] | None = None,
    config: dict[str, Any] | None = None,
) -> dict[str, Any]:
    try:
        if message.get("type") != "print":
            raise ValueError("Acción no soportada.")
        payload = message.get("payload")
        if not isinstance(payload, dict):
            raise ValueError("Faltan los datos de impresión.")
        print_ticket(payload.get("target"), payload.get("ticket"), config, printer_factory)
        return {"ok": True}
    except Exception as error:
        return {"ok": False, "error": safe_text(error, 240) or "No se pudo imprimir."}


def main() -> int:
    source = sys.stdin.buffer
    destination = sys.stdout.buffer
    while True:
        try:
            message = read_message(source)
        except Exception as error:
            write_message(destination, {"ok": False, "error": safe_text(error)})
            return 1
        if message is None:
            return 0
        write_message(destination, dispatch_message(message))


if __name__ == "__main__":
    raise SystemExit(main())
