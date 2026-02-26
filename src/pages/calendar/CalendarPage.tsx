/**
 * Page du calendrier - Template de base
 * À personnaliser par l'équipe Design
 */

function CalendarPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Calendrier des réservations
            </h1>
            <p className="text-gray-600">
              Vue d'ensemble du planning
            </p>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Vue calendrier</h3>
              <div className="flex space-x-2">
                <button className="btn-secondary">Jour</button>
                <button className="btn-secondary">Semaine</button>
                <button className="btn-primary">Mois</button>
              </div>
            </div>
            <div className="card-body">
              <p className="text-gray-500 text-center py-16">
                Composant calendrier à implémenter par l'équipe Design
                <br />
                Les hooks useBookings fournissent les données calendarEvents
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CalendarPage