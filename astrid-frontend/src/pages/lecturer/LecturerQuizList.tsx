import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getQuizzes, type Quiz } from "../../lib/api/quizzes";
import AppHeader from "../../components/AppHeader";

export default function LecturerQuizList() {
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery<Quiz[]>({
    queryKey: ["lecturer-quizzes"],
    queryFn: getQuizzes,
  });

  return (
    <div className="min-h-screen bg-[var(--paper)] p-6">
      <AppHeader title="My Quiz" />
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate("/create-quiz")}
            className="bg-[var(--brand)] text-white px-4 py-2 rounded-lg hover:opacity-90"
          >
            Create Quiz
          </button>
        </div>

        {isLoading && <p>Loading quizzes...</p>}

        {error && (
          <p className="text-red-600">
            Failed to load quizzes
          </p>
        )}

        {!isLoading && data?.length === 0 && (
          <div className="bg-white rounded-xl shadow border p-5">
            <p className="text-gray-600">No quizzes found.</p>
          </div>
        )}

        <div className="grid gap-4">
          {data?.map((quiz) => (
            <div
              key={String(quiz.id)}
              className="bg-white rounded-xl shadow border p-5"
            >
              <h2 className="text-lg font-semibold">{quiz.title}</h2>

              {quiz.description && (
                <p className="text-gray-600 mt-1">{quiz.description}</p>
              )}

              {quiz.duration !== undefined && quiz.duration !== null && (
                <p className="text-sm text-gray-500 mt-2">
                  Duration: {quiz.duration} minutes
                </p>
              )}

              <div className="flex flex-wrap gap-3 mt-4">
                <button
                  onClick={() => navigate(`/add-question/${quiz.id}`)}
                  className="bg-[var(--brand)] text-white px-4 py-2 rounded-lg hover:opacity-90"
                >
                  Add Questions
                </button>

                <button
                  onClick={() => navigate(`/quiz/${quiz.id}/play`)}
                  className="border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50"
                >
                  Preview Quiz
                </button>

                <button
                  onClick={() => navigate(`/lecturer/quiz/${quiz.id}/results`)}
                  className="border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50"
                >
                  View Results
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}