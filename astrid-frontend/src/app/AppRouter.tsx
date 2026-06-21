import { Routes, Route } from "react-router-dom";
import Landing from "../pages/Landing";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import StudentDashboard from "../pages/student/Dashboard";
import QuizPlay from "../pages/student/QuizPlay";
import QuizResult from "../pages/student/QuizResult";
import ProtectedRoute from "./routes/ProtectedRoute";
import QuizResults from "../pages/lecturer/QuizResults";
import SubjectDetail from "../pages/lecturer/SubjectDetail";
import LecturerDashboard from "../pages/lecturer/LecturerDashboard";
import CreateQuiz from "../pages/lecturer/CreateQuiz";
import AddQuestion from "../pages/lecturer/AddQuestion";
import LecturerQuizList from "../pages/lecturer/LecturerQuizList";
import Subjects from "../pages/lecturer/Subjects";
import Chat from "../pages/student/Chat";
import AdminDashboard from "../pages/admin/AdminDashboard";
import AdminYearSubjects from "../pages/admin/AdminYearSubjects";
import AdminSubjectPerformance from "../pages/admin/AdminSubjectPerformance";
import StudentJourney from "../pages/student/Journey";
import LecturerJourney from "../pages/lecturer/Journey";
import AdminJourney from "../pages/admin/Journey";

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/quiz/:id/play"
        element={
          <ProtectedRoute>
            <QuizPlay />
          </ProtectedRoute>
        }
      />

      <Route
        path="/quiz/:id/result"
        element={
          <ProtectedRoute>
            <QuizResult />
          </ProtectedRoute>
        }
      />

      <Route
        path="/journey"
        element={
          <ProtectedRoute>
            <StudentJourney />
          </ProtectedRoute>
        }
      />

      <Route
        path="/lecturer"
        element={
          <ProtectedRoute>
            <LecturerDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/lecturer/quizzes"
        element={
          <ProtectedRoute>
            <LecturerQuizList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/lecturer/journey"
        element={
          <ProtectedRoute>
            <LecturerJourney />
          </ProtectedRoute>
        }
      />

      {/* ← NEW subjects route */}
      <Route
        path="/lecturer/subjects"
        element={
          <ProtectedRoute>
            <Subjects />
          </ProtectedRoute>
        }
      />

      <Route
        path="/create-quiz"
        element={
          <ProtectedRoute>
            <CreateQuiz />
          </ProtectedRoute>
        }
      />

      <Route
        path="/add-question/:id"
        element={
          <ProtectedRoute>
            <AddQuestion />
          </ProtectedRoute>
        }
      />

      <Route
        path="/lecturer/quiz/:id/results"
        element={
          <ProtectedRoute>
            <QuizResults />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lecturer/subject/:id"
        element={
          <ProtectedRoute>
            <SubjectDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <Chat />
          </ProtectedRoute>
        }
      />
      <Route path="/admin" element={
        <ProtectedRoute roles={["admin"]}><AdminDashboard /></ProtectedRoute>
      } />
      <Route path="/admin/journey" element={
        <ProtectedRoute roles={["admin"]}><AdminJourney /></ProtectedRoute>
      } />
      <Route path="/admin/year/:year" element={
        <ProtectedRoute roles={["admin"]}><AdminYearSubjects /></ProtectedRoute>
      } />
      <Route path="/admin/subject/:id" element={
        <ProtectedRoute roles={["admin"]}><AdminSubjectPerformance /></ProtectedRoute>
      } />
    </Routes>
  );
}
