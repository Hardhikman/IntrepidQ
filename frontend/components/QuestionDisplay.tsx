import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { GeneratedQuestion } from "@/lib/supabase";
import { Star } from 'lucide-react';
import { useState } from 'react';


interface QuestionDisplayProps {
  question: GeneratedQuestion;
  answer: any; // Or a more specific type if available
  index: number;
  onFeedbackSubmit: (questionId: string, rating: number, comment: string) => void;
}

export const QuestionDisplay: React.FC<QuestionDisplayProps> = ({ question, answer, index, onFeedbackSubmit }) => {
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState('');

  const handleFeedbackSubmit = () => {
    if (rating > 0) {
      onFeedbackSubmit(question.id, rating, comment);
    }
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
          <div className="flex items-center space-x-1 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-6 w-6 cursor-pointer ${rating >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                onClick={() => setRating(star)}
              />
            ))}
          </div>
          {rating > 0 && (
            <div className="mt-2">
              <Textarea
                placeholder="Provide additional feedback... (optional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <Button size="sm" className="mt-2" onClick={handleFeedbackSubmit}>Submit Feedback</Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
