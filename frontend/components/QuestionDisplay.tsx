import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GeneratedQuestion } from "@/lib/supabase";
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { useState } from 'react';


interface QuestionDisplayProps {
  question: GeneratedQuestion;
  answer: any; // Or a more specific type if available
  index: number;
  onFeedbackSubmit: (questionId: string, rating: number, comment: string) => void;
}

export const QuestionDisplay: React.FC<QuestionDisplayProps> = ({ question, answer, index, onFeedbackSubmit }) => {
  const [feedback, setFeedback] = useState<'good' | 'bad' | null>(null);

  const handleFeedbackSubmit = (rating: number) => {
    setFeedback(rating > 3 ? 'good' : 'bad');
    onFeedbackSubmit(question.id, rating, rating > 3 ? 'Good question' : 'Needs improvement');
  };


  return (
    <Card key={question.id || index} className="mb-5">
      <CardContent className="p-4">
        <p className="whitespace-pre-wrap font-mono">{question.questions}</p>
        {answer && (
          <div className="mt-4 p-3 bg-gray-50 rounded">
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
        <div className="mt-4 border-t pt-4">
          <h5 className="font-semibold mb-2">Rate this question:</h5>
          <div className="flex items-center space-x-4">
            <Button
              variant={feedback === 'good' ? "default" : "outline"}
              size="sm"
              onClick={() => handleFeedbackSubmit(5)}
              className={feedback === 'good' ? "bg-green-500 hover:bg-green-600" : ""}
            >
              <ThumbsUp className="h-4 w-4 mr-2" />
              Good
            </Button>
            <Button
              variant={feedback === 'bad' ? "default" : "outline"}
              size="sm"
              onClick={() => handleFeedbackSubmit(1)}
              className={feedback === 'bad' ? "bg-red-500 hover:bg-red-600" : ""}
            >
              <ThumbsDown className="h-4 w-4 mr-2" />
              Bad
            </Button>
          </div>
          {feedback && (
            <div className="mt-2 text-sm text-gray-600">
              Thank you for your feedback!
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
