import io
import json
import struct
import unittest

import vexora_host


class FakePrinter:
    def __init__(self, *args, **kwargs):
        self.args = args
        self.kwargs = kwargs
        self.lines = []
        self.closed = False

    def set(self, **kwargs):
        pass

    def text(self, value):
        self.lines.append(value)

    def cut(self):
        self.lines.append("<cut>")

    def barcode(self, code, barcode_type, **kwargs):
        self.lines.append(f"<barcode:{barcode_type}:{code}>")

    def qr(self, content, **kwargs):
        self.lines.append(f"<qr:{content}>")

    def close(self):
        self.closed = True


class NativeHostTests(unittest.TestCase):
    def test_reads_and_writes_native_messaging_frames(self):
        output = io.BytesIO()
        expected = {"type": "print", "payload": {"target": "caja"}}
        vexora_host.write_message(output, expected)
        output.seek(0)
        self.assertEqual(vexora_host.read_message(output), expected)
        self.assertIsNone(vexora_host.read_message(output))

    def test_rejects_oversized_message_before_reading_body(self):
        source = io.BytesIO(struct.pack("<I", vexora_host.MAX_MESSAGE_BYTES + 1))
        with self.assertRaisesRegex(ValueError, "tamaño permitido"):
            vexora_host.read_message(source)

    def test_dispatch_prints_a_closure_using_configured_usb_ids(self):
        printer = FakePrinter()

        def make_printer(*args, **kwargs):
            printer.args = args
            printer.kwargs = kwargs
            return printer

        result = vexora_host.dispatch_message(
            {
                "type": "print",
                "payload": {
                    "target": "caja",
                    "ticket": {
                        "tipo": "CIERRE",
                            "copy": True,
                        "resumen": [{"label": "Diferencia efectivo", "valor": "$0"}],
                        "desglose": [{"label": "$50.000", "cantidad": 2, "total": "$100.000"}],
                        "resultado": "CAJA CUADRADA",
                    },
                },
            },
            printer_factory=make_printer,
            config={"vendor_id": "0x04b8", "product_id": "0x0202", "interface": 0},
        )
        self.assertEqual(result, {"ok": True})
        self.assertEqual(printer.args, (0x04B8, 0x0202))
        self.assertTrue(printer.closed)
        printed = "".join(printer.lines)
        self.assertIn("CIERRE DE CAJA", printed)
        self.assertIn("Diferencia efectivo: $0", printed)
        self.assertIn("$50.000 x 2", printed)
        self.assertIn("*** COPIA ***", printed)

    def test_rejects_invalid_target_without_opening_printer(self):
        result = vexora_host.dispatch_message(
            {"type": "print", "payload": {"target": "unknown", "ticket": {}}},
            printer_factory=lambda *_args, **_kwargs: self.fail("printer must not open"),
            config={"vendor_id": "0x04b8", "product_id": "0x0202"},
        )
        self.assertFalse(result["ok"])
        self.assertIn("caja o cocina", result["error"])

    def test_renders_only_valid_twelve_digit_code128(self):
        printer = FakePrinter()
        vexora_host.render_ticket(printer, {"tipoCodigo": "BARCODE", "barcode12": "750000010234"}, "caja")
        self.assertIn("<barcode:CODE128:750000010234>", printer.lines)

        invalid_printer = FakePrinter()
        vexora_host.render_ticket(invalid_printer, {"tipoCodigo": "BARCODE", "barcode12": "sale-123"}, "caja")
        self.assertFalse(any(line.startswith("<barcode:") for line in invalid_printer.lines))
        self.assertTrue(any("12 digitos" in line for line in invalid_printer.lines))

    def test_renders_configured_qr_value(self):
        printer = FakePrinter()
        vexora_host.render_ticket(printer, {"tipoCodigo": "QR", "qrValue": "https://example.test/verify/123"}, "caja")
        self.assertIn("<qr:https://example.test/verify/123>", printer.lines)

    def test_prints_cash_received_and_change(self):
        printer = FakePrinter()
        vexora_host.render_ticket(printer, {
            "paymentMethod": "efectivo",
            "cashReceived": 20000,
            "changeDue": 7500,
        }, "caja")
        printed = "".join(printer.lines)
        self.assertIn("Pago: efectivo", printed)
        self.assertIn("Recibido: $20.000", printed)
        self.assertIn("Devuelta: $7.500", printed)


if __name__ == "__main__":
    unittest.main()
