import { useState, useMemo, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { 
  quizSchema, 
  type QuizAnswers, 
  type QuizQuestion,
  MANDATORY_QUESTIONS,
  ROMANCE_QUESTIONS,
  NONFICTION_QUESTIONS,
  RANDOM_QUESTIONS
} from "@shared/schema";
import { useRecommendations } from "@/hooks/use-books";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle2, Info } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function Quiz() {
  const [currentStep, setCurrentStep] = useState(0);
  const [, setLocation] = useLocation();
  const mutation = useRecommendations();
  
  const form = useForm<QuizAnswers>({
    resolver: zodResolver(quizSchema),
    defaultValues: {
      fictionType: undefined,
      ageGroup: undefined,
      genres: [],
      nonfictionCategory: [],
      mood: [],
      readingGoal: [],
      tropes: [],
      romanceTropes: [],
      avoidTropes: [],
      avoidTopics: [],
    },
  });

  // Watch for changes to determine which questions to show
  const selectedGenres = form.watch("genres") || [];
  const selectedFictionType = form.watch("fictionType");
  const selectedAgeGroup = form.watch("ageGroup");
  
  const hasRomanceSelected = selectedGenres.includes("romance");
  const isNonfictionOnly = selectedFictionType === "nonfiction";
  const isYoungerAudience = ["children", "middle-grade", "young-adult"].includes(selectedAgeGroup || "");

  // Check if nonfiction genres are selected
  const hasNonfictionSelected = selectedFictionType === "nonfiction" || 
    selectedFictionType === "both" ||
    selectedGenres.some(g => ["nonfiction", "biography", "self-help"].includes(g));

  // Shuffle random questions ONCE per quiz session (prevents questions from jumping)
  const shuffledRandomRef = useRef<QuizQuestion[]>(shuffleArray([...RANDOM_QUESTIONS]));

  // Build question list dynamically based on selections
  const allQuestions = useMemo(() => {
    const questions: QuizQuestion[] = [...MANDATORY_QUESTIONS];
    
    // Add nonfiction category question if nonfiction is selected
    if (hasNonfictionSelected) {
      questions.push(...NONFICTION_QUESTIONS);
    }
    
    // Add romance questions only if romance is selected
    // Skip all romance questions for younger audiences (children, middle-grade, YA)
    if (hasRomanceSelected && !isYoungerAudience) {
      questions.push(...ROMANCE_QUESTIONS.filter(q => !q.adultOnly || !isYoungerAudience));
    }
    
    // Filter from the stable shuffled pool (no re-shuffling mid-quiz)
    let randomPool = shuffledRandomRef.current;
    if (isNonfictionOnly) {
      randomPool = randomPool.filter(q => !q.fictionOnly);
    }
    if (isYoungerAudience) {
      randomPool = randomPool.filter(q => !q.adultOnly);
    }
    
    // Pick random questions to reach 10 total
    const targetTotal = 10;
    const remainingSlots = Math.max(0, targetTotal - questions.length);
    questions.push(...randomPool.slice(0, remainingSlots));
    
    return questions;
  }, [hasRomanceSelected, hasNonfictionSelected, isNonfictionOnly, isYoungerAudience]);

  const onSubmit = (data: QuizAnswers) => {
    const cleanedData = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== undefined && v !== null)
    ) as QuizAnswers;
    
    mutation.mutate(cleanedData, {
      onSuccess: (result) => {
        sessionStorage.setItem("recommendations", JSON.stringify(result));
        sessionStorage.setItem("quizAnswers", JSON.stringify(cleanedData));
        setLocation("/results");
      },
    });
  };

  const nextStep = () => {
    if (currentStep < allQuestions.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  useEffect(() => {
    if (currentStep >= allQuestions.length && allQuestions.length > 0) {
      setCurrentStep(allQuestions.length - 1);
    }
  }, [allQuestions.length, currentStep]);

  // Guard for empty questions
  if (allQuestions.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col font-sans">
        <Navigation />
        <main className="flex-1 container max-w-2xl mx-auto px-4 py-8 flex items-center justify-center">
          <p className="text-muted-foreground">Loading questions...</p>
        </main>
      </div>
    );
  }

  const progress = ((currentStep + 1) / allQuestions.length) * 100;
  const currentQuestion = allQuestions[currentStep];

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-background flex flex-col font-sans">
        <Navigation />
        <main className="flex-1 container max-w-2xl mx-auto px-4 py-8 flex items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </main>
      </div>
    );
  }

  const renderQuestion = (question: QuizQuestion) => {
    switch (question.type) {
      case "single":
        return (
          <FormField
            control={form.control}
            name={question.field}
            render={({ field }) => (
              <FormItem className="space-y-4">
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value as string}
                    className="grid grid-cols-1 md:grid-cols-2 gap-3"
                  >
                    {question.options?.map((option) => (
                      <FormItem key={option.value}>
                        <FormControl>
                          <RadioGroupItem 
                            value={option.value} 
                            className="peer sr-only" 
                            id={`${question.id}-${option.value}`} 
                            data-testid={`radio-${question.id}-${option.value}`}
                          />
                        </FormControl>
                        <FormLabel 
                          htmlFor={`${question.id}-${option.value}`}
                          className="flex items-center gap-3 p-4 rounded-xl border-2 border-border cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 transition-all"
                          data-testid={`label-${question.id}-${option.value}`}
                        >
                          <span className="font-medium">{option.label}</span>
                        </FormLabel>
                      </FormItem>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case "slider":
        return (
          <FormField
            control={form.control}
            name={question.field}
            render={({ field }) => (
              <FormItem className="space-y-6">
                <div className="flex justify-between items-center">
                  <FormLabel className="text-lg font-bold">
                    Select a level
                  </FormLabel>
                  <span className="text-primary font-bold text-lg bg-primary/10 px-3 py-1 rounded-md">
                    {field.value ?? 3}/{question.max}
                  </span>
                </div>
                <FormControl>
                  <Slider
                    min={question.min || 1}
                    max={question.max || 5}
                    step={1}
                    value={[typeof field.value === 'number' ? field.value : 3]}
                    onValueChange={(vals) => field.onChange(vals[0])}
                    className="py-4"
                    data-testid={`slider-${question.id}`}
                  />
                </FormControl>
                <div className="flex justify-between text-xs text-muted-foreground px-1">
                  <span>1 - Low</span>
                  <span>3 - Medium</span>
                  <span>5 - High</span>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case "multiple": {
        const watchedValues = form.watch(question.field) as string[] | undefined;
        const currentSelections = watchedValues || [];
        const atLimit = question.maxSelections ? currentSelections.length >= question.maxSelections : false;
        return (
          <FormField
            control={form.control}
            name={question.field}
            render={() => (
              <FormItem>
                {question.maxSelections && (
                  <p className="text-sm text-muted-foreground mb-2" data-testid={`text-selection-count-${question.id}`}>
                    {currentSelections.length} / {question.maxSelections} selected
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2">
                  {question.options?.map((option) => (
                    <FormField
                      key={option.value}
                      control={form.control}
                      name={question.field}
                      render={({ field }) => {
                        const currentValue = (field.value as string[]) || [];
                        const isChecked = currentValue.includes(option.value);
                        const isDisabled = !isChecked && atLimit;
                        return (
                          <FormItem
                            className={`flex flex-row items-center space-x-3 space-y-0 rounded-lg border p-3 transition-colors ${isDisabled ? "opacity-50" : ""}`}
                          >
                            <FormControl>
                              <Checkbox
                                checked={isChecked}
                                disabled={isDisabled}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...currentValue, option.value])
                                    : field.onChange(
                                        currentValue.filter((v) => v !== option.value)
                                      );
                                }}
                                data-testid={`checkbox-${question.id}-${option.value}`}
                              />
                            </FormControl>
                            <FormLabel className={`font-normal cursor-pointer w-full text-sm ${isDisabled ? "cursor-not-allowed" : ""}`}>
                              {option.label}
                            </FormLabel>
                          </FormItem>
                        );
                      }}
                    />
                  ))}
                </div>
              </FormItem>
            )}
          />
        );
      }

      case "boolean":
        return (
          <FormField
            control={form.control}
            name={question.field}
            render={({ field }) => (
              <FormItem className="flex flex-col items-center gap-6 py-8">
                <div className="flex items-center gap-4">
                  <span className={`text-lg font-medium ${!field.value ? "text-primary" : "text-muted-foreground"}`}>
                    No
                  </span>
                  <FormControl>
                    <Switch
                      checked={!!field.value}
                      onCheckedChange={field.onChange}
                      className="scale-125"
                      data-testid={`switch-${question.id}`}
                    />
                  </FormControl>
                  <span className={`text-lg font-medium ${field.value ? "text-primary" : "text-muted-foreground"}`}>
                    Yes
                  </span>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      default:
        return null;
    }
  };

  // Check if this is a romance-specific question
  const isRomanceQuestion = currentQuestion.romanceOnly;

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <SEOHead
        title="Book Recommendation Quiz"
        description="Answer a few questions about your mood and preferences to get personalized book recommendations."
      />
      <Navigation />
      
      <main className="flex-1 container max-w-2xl mx-auto px-4 py-8 md:py-12">
        <div className="mb-8 space-y-2">
          <div className="flex justify-between text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
            <span>
              Question {currentStep + 1} of {allQuestions.length}
            </span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" data-testid="progress-bar" />
        </div>

        <Card className="p-6 md:p-8 shadow-xl border-border/60 bg-card/50 backdrop-blur-sm">
          <div className="mb-8">
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
              {currentQuestion.question}
            </h1>
            {currentQuestion.type === "multiple" && (
              <p className="text-muted-foreground">Select all that apply</p>
            )}
            {isRomanceQuestion && (
              <div className="flex items-center gap-2 mt-3 p-3 bg-primary/5 rounded-lg text-sm text-muted-foreground">
                <Info className="w-4 h-4 text-primary" />
                <span>This question appears because you selected Romance</span>
              </div>
            )}
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {renderQuestion(currentQuestion)}
                </motion.div>
              </AnimatePresence>

              <div className="flex justify-between pt-6 border-t border-border gap-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={prevStep}
                  disabled={currentStep === 0}
                  data-testid="button-prev"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>

                {currentStep === allQuestions.length - 1 ? (
                  <Button 
                    type="button"
                    size="lg" 
                    disabled={mutation.isPending}
                    onClick={() => form.handleSubmit(onSubmit)()}
                    data-testid="button-submit-quiz"
                  >
                    {mutation.isPending ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Finding...
                      </span>
                    ) : (
                      <>Get Recommendations <CheckCircle2 className="ml-2 h-4 w-4" /></>
                    )}
                  </Button>
                ) : (
                  <Button 
                    type="button" 
                    onClick={nextStep}
                    data-testid="button-next"
                  >
                    Next <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </Card>

        <p className="text-center text-muted-foreground text-sm mt-6">
          {currentStep < 2 
            ? "Answer these to help us find the right books for you"
            : hasRomanceSelected 
              ? "Romance-specific questions appear because you selected Romance"
              : "Questions tailored to your genre preferences"
          }
        </p>
      </main>
    </div>
  );
}
