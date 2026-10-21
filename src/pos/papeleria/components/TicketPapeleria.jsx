import { SaleReceipt } from '../../../shared/components/Payment/SaleReceipt.jsx'

export function TicketPapeleria({ items = [], paymentMethod, cashReceived, changeDue, dian, sale, businessName = 'Papel Color', onClose = () => {}, onIssued = () => {} }) {
  return <SaleReceipt items={items} paymentMethod={paymentMethod} cashReceived={cashReceived} changeDue={changeDue} dian={dian} gremio="papeleria" sale={sale} businessName={businessName} onClose={onClose} onIssued={onIssued} />
}
