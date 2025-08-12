import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Plus, Trash2 } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

const quizSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  duration: z.number().min(1, "Duration must be at least 1 minute"),
  isActive: z.boolean().default(false),
});

const questionSchema = z.object({
  questionText: z.string().min(1, "Question text is required"),
  questionType: z.enum(['multiple_choice', 'true_false', 'short_answer']),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string().min(1, "Correct answer is required"),
  points: z.number().min(1, "Points must be at least 1"),
  order: z.number(),
});

interface QuizCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QuizCreatorModal({ isOpen, onClose }: QuizCreatorModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [questions, setQuestions] = useState<any[]>([]);

  const form = useForm({
    resolver: zodResolver(quizSchema),
    defaultValues: {
      title: "",
      description: "",
      duration: 30,
      isActive: false,
    },
  });

  const createQuizMutation = useMutation({
    mutationFn: async (quizData: any) => {
      const response = await apiRequest("POST", "/api/quizzes", quizData);
      return response.json();
    },
    onSuccess: async (quiz) => {
      // Create questions for the quiz
      for (const [index, question] of questions.entries()) {
        try {
          await apiRequest("POST", `/api/quizzes/${quiz.id}/questions`, {
            ...question,
            order: index + 1,
          });
        } catch (error) {
          console.error("Error creating question:", error);
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/quizzes"] });
      toast({
        title: "Success",
        description: "Quiz created successfully!",
      });
      onClose();
      form.reset();
      setQuestions([]);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create quiz. Please try again.",
        variant: "destructive",
      });
    },
  });

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        questionText: "",
        questionType: "multiple_choice",
        options: ["", ""],
        correctAnswer: "",
        points: 10,
      },
    ]);
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    setQuestions(prev => 
      prev.map((q, i) => i === index ? { ...q, [field]: value } : q)
    );
  };

  const addOption = (questionIndex: number) => {
    setQuestions(prev =>
      prev.map((q, i) => 
        i === questionIndex 
          ? { ...q, options: [...(q.options || []), ""] }
          : q
      )
    );
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    setQuestions(prev =>
      prev.map((q, i) =>
        i === questionIndex
          ? {
              ...q,
              options: q.options?.map((opt: string, oi: number) =>
                oi === optionIndex ? value : opt
              ),
            }
          : q
      )
    );
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    setQuestions(prev =>
      prev.map((q, i) =>
        i === questionIndex
          ? {
              ...q,
              options: q.options?.filter((_: any, oi: number) => oi !== optionIndex),
            }
          : q
      )
    );
  };

  const removeQuestion = (index: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = (data: any) => {
    if (questions.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one question.",
        variant: "destructive",
      });
      return;
    }

    createQuizMutation.mutate(data);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" data-testid="modal-quiz-creator">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-black bg-opacity-50" onClick={onClose}></div>
        
        <div className="inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-surface shadow-material-lg rounded-2xl">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">Create New Quiz</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                data-testid="button-close-modal"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
          
          <form onSubmit={form.handleSubmit(onSubmit)} className="px-6 py-6">
            <div className="space-y-6">
              {/* Quiz Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="title">Quiz Title *</Label>
                  <Input
                    id="title"
                    {...form.register("title")}
                    placeholder="Enter quiz title"
                    data-testid="input-quiz-title"
                  />
                  {form.formState.errors.title && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.title.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="duration">Duration (minutes) *</Label>
                  <Input
                    id="duration"
                    type="number"
                    {...form.register("duration", { valueAsNumber: true })}
                    placeholder="45"
                    data-testid="input-quiz-duration"
                  />
                  {form.formState.errors.duration && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.duration.message}
                    </p>
                  )}
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...form.register("description")}
                  placeholder="Brief description of the quiz content and objectives"
                  data-testid="textarea-quiz-description"
                />
              </div>

              {/* Quiz Questions */}
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-900">Questions</h4>
                  <Button
                    type="button"
                    onClick={addQuestion}
                    data-testid="button-add-question"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Question
                  </Button>
                </div>

                <div className="space-y-6">
                  {questions.map((question, questionIndex) => (
                    <div key={questionIndex} className="bg-gray-50 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="font-medium text-gray-900">Question {questionIndex + 1}</h5>
                        <div className="flex items-center space-x-2">
                          <Select
                            value={question.questionType}
                            onValueChange={(value) => updateQuestion(questionIndex, 'questionType', value)}
                          >
                            <SelectTrigger className="w-48" data-testid={`select-question-type-${questionIndex}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                              <SelectItem value="true_false">True/False</SelectItem>
                              <SelectItem value="short_answer">Short Answer</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeQuestion(questionIndex)}
                            data-testid={`button-remove-question-${questionIndex}`}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <Label>Question Text *</Label>
                          <Input
                            value={question.questionText}
                            onChange={(e) => updateQuestion(questionIndex, 'questionText', e.target.value)}
                            placeholder="Enter your question"
                            data-testid={`input-question-text-${questionIndex}`}
                          />
                        </div>
                        
                        {question.questionType === 'multiple_choice' && (
                          <div>
                            <Label>Answer Options</Label>
                            <div className="space-y-3">
                              {question.options?.map((option: string, optionIndex: number) => (
                                <div key={optionIndex} className="flex items-center space-x-3">
                                  <input
                                    type="radio"
                                    name={`correct-answer-${questionIndex}`}
                                    checked={question.correctAnswer === option}
                                    onChange={() => updateQuestion(questionIndex, 'correctAnswer', option)}
                                    className="w-4 h-4 text-primary"
                                    data-testid={`radio-correct-${questionIndex}-${optionIndex}`}
                                  />
                                  <Input
                                    value={option}
                                    onChange={(e) => updateOption(questionIndex, optionIndex, e.target.value)}
                                    placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
                                    className="flex-1"
                                    data-testid={`input-option-${questionIndex}-${optionIndex}`}
                                  />
                                  {question.options.length > 2 && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeOption(questionIndex, optionIndex)}
                                      data-testid={`button-remove-option-${questionIndex}-${optionIndex}`}
                                    >
                                      <X className="w-4 h-4 text-red-600" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => addOption(questionIndex)}
                                data-testid={`button-add-option-${questionIndex}`}
                              >
                                + Add Option
                              </Button>
                            </div>
                          </div>
                        )}

                        {question.questionType === 'true_false' && (
                          <div>
                            <Label>Correct Answer</Label>
                            <Select
                              value={question.correctAnswer}
                              onValueChange={(value) => updateQuestion(questionIndex, 'correctAnswer', value)}
                            >
                              <SelectTrigger data-testid={`select-true-false-${questionIndex}`}>
                                <SelectValue placeholder="Select correct answer" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="true">True</SelectItem>
                                <SelectItem value="false">False</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {question.questionType === 'short_answer' && (
                          <div>
                            <Label>Expected Answer</Label>
                            <Input
                              value={question.correctAnswer}
                              onChange={(e) => updateQuestion(questionIndex, 'correctAnswer', e.target.value)}
                              placeholder="Enter the expected answer"
                              data-testid={`input-short-answer-${questionIndex}`}
                            />
                          </div>
                        )}
                        
                        <div>
                          <Label>Points</Label>
                          <Input
                            type="number"
                            value={question.points}
                            onChange={(e) => updateQuestion(questionIndex, 'points', parseInt(e.target.value) || 10)}
                            placeholder="10"
                            className="w-24"
                            data-testid={`input-points-${questionIndex}`}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createQuizMutation.isPending}
                data-testid="button-create-quiz"
              >
                {createQuizMutation.isPending ? "Creating..." : "Create Quiz"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
