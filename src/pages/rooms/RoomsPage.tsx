/**
 * Page de gestion des salles - Template de base
 * À personnaliser par l'équipe Design
 */

function RoomsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Gestion des salles
            </h1>
            <p className="text-gray-600">
              Gérer les salles de l'établissement
            </p>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Liste des salles</h3>
              <button className="btn-primary">
                Ajouter une salle
              </button>
            </div>
            <div className="card-body">
              <p className="text-gray-500 text-center py-8">
                Interface à implémenter par l'équipe Design
                <br />
                Les hooks useRooms sont prêts à être utilisés
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RoomsPage