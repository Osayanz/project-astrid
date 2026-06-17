from .users       import router as users_router
from .quizzes     import router as quizzes_router
from .attempts    import router as attempts_router
from .predictions import router as predictions_router
from .subjects    import router as subjects_router
from .overview    import router as overview_router

all_routers = [users_router, quizzes_router, attempts_router,
               predictions_router, subjects_router, overview_router]