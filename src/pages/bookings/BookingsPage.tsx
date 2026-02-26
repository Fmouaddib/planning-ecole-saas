/**
 * Page de gestion des réservations - Template de base
 * À personnaliser par l'équipe Design
 */

function BookingsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Gestion des réservations
            </h1>
            <p className="text-gray-600">
              Créer et gérer les réservations
            </p>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Liste des réservations</h3>
              <button className="btn-primary">
                Nouvelle réservation
              </button>
            </div>
            <div className="card-body">
              <p className="text-gray-500 text-center py-8">
                Interface à implémenter par l'équipe Design
                <br />
                Les hooks useBookings sont prêts à être utilisés
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BookingsPage