import { Card, CardContent } from "@/components/ui/card";
import { GeneratedQuestion } from "@/lib/supabase";


interface QuestionDisplayProps {
  question: GeneratedQuestion;
  answer: any; // Or a more specific type if available
  index: number;
}

export const QuestionDisplay: React.FC<QuestionDisplayProps> = ({ question, answer, index }) => {
  return (
    <Card key={question.id || index} className="mb-5">
      <CardContent className="p-4">
        <div
          onCopy={(e) => e.preventDefault()}
          onCut={(e) => e.preventDefault()}
          onContextMenu={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
        >
          <p className="whitespace-pre-wrap font-mono select-none">{question.questions}</p>
        </div>
        {answer && (
          <div
            className="mt-4 p-3 bg-gray-50 rounded select-none"
            onCopy={(e) => e.preventDefault()}
            onCut={(e) => e.preventDefault()}
            onContextMenu={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
          >
            <h4 className="font-bold">Answer:</h4>
            <p><strong>Introduction:</strong> {answer.introduction}</p>
            <div><strong>Body:</strong>
              <ul className="list-disc pl-5">
                {answer.body.map((keyword: string, i: number) => (
                  <li key={i}>{keyword}</li>
                ))}
              </ul>
            </div>
            <p><strong>Conclusion:</strong> {answer.conclusion}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};