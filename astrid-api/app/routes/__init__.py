from .users         import router as users_router
from .quizzes       import router as quizzes_router
from .attempts      import router as attempts_router
from .predictions   import router as predictions_router
from .subjects      import router as subjects_router
from .overview      import router as overview_router
from .chat          import router as chat_router
from .notifications import router as notifications_router
from .admin         import router as admin_router

all_routers = [users_router, quizzes_router, attempts_router,
               predictions_router, subjects_router, overview_router,
               chat_router, notifications_router, admin_router]