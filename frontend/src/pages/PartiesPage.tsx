import { MobileLayout } from '../components/Layouts'
import { Badge } from '../components/UI'

const PartiesPage = () => {
  return (
    <MobileLayout>
      <div style={{ textAlign: 'center', margin: '60px 0' }}>
        <h1 className="page-title">Tus Partys</h1>
        <p className="empty-sub" style={{ marginBottom: '20px' }}>
          Próximamente podrás ver y gestionar todas tus partys de estudio aquí.
        </p>
        <Badge variant="primary">En Construcción 🚧</Badge>
      </div>
    </MobileLayout>
  )
}

export default PartiesPage
