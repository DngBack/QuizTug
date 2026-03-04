import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Upload, Gamepad2, Settings, FileText, Loader2 } from "lucide-react";

const createRoomSchema = z.object({
  hostName: z.string().min(1, "Your name is required").max(30),
  timeLimit: z.number().min(60).max(1800),
  answerWindow: z.number().min(5).max(60),
  stunDuration: z.number().min(0).max(5),
  correctPull: z.number().min(1).max(50),
  wrongPenalty: z.number().min(0).max(50),
  shuffleQuestions: z.boolean(),
});

type CreateRoomForm = z.infer<typeof createRoomSchema>;

export default function CreateRoom() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState("");

  const form = useForm<CreateRoomForm>({
    resolver: zodResolver(createRoomSchema),
    defaultValues: {
      hostName: "",
      timeLimit: 300,
      answerWindow: 15,
      stunDuration: 1,
      correctPull: 10,
      wrongPenalty: 5,
      shuffleQuestions: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateRoomForm & { csvData: string }) => {
      const res = await apiRequest("POST", "/api/rooms", data);
      return res.json();
    },
    onSuccess: (data) => {
      setLocation(`/lobby/${data.roomCode}?host=true&playerId=${data.hostPlayerId}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create room",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCsvText(ev.target?.result as string);
    };
    reader.readAsText(file);
  };

  const onSubmit = (data: CreateRoomForm) => {
    if (!csvText.trim()) {
      toast({
        title: "Questions required",
        description: "Please upload a CSV file or paste question data.",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate({ ...data, csvData: csvText });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
        >
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            className="mb-6"
            data-testid="button-back-home"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Gamepad2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Create a Game Room</h1>
          </div>
          <p className="text-muted-foreground">Set up your quiz, configure settings, and invite your students.</p>
        </motion.div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Settings className="w-4 h-4" />
                    Basic Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="hostName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your Name</FormLabel>
                        <FormControl>
                          <Input
                            data-testid="input-host-name"
                            placeholder="e.g. Mr. Smith"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="w-4 h-4" />
                    Questions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="mb-2 block">Upload CSV File</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="csv-upload"
                        data-testid="input-csv-upload"
                      />
                      <label
                        htmlFor="csv-upload"
                        className="cursor-pointer flex flex-col items-center gap-2"
                      >
                        <div className="w-12 h-12 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                          <Upload className="w-6 h-6 text-primary" />
                        </div>
                        {fileName ? (
                          <span className="text-sm font-medium text-foreground">{fileName}</span>
                        ) : (
                          <>
                            <span className="text-sm font-medium text-foreground">Click to upload CSV</span>
                            <span className="text-xs text-muted-foreground">or paste data below</span>
                          </>
                        )}
                      </label>
                    </div>
                  </div>

                  <div>
                    <Label className="mb-2 block">Or Paste CSV Data</Label>
                    <Textarea
                      data-testid="input-csv-text"
                      placeholder={`id,question,type,choice_a,choice_b,choice_c,choice_d,answer\n1,What is 2+2?,mcq,3,4,5,6,B\n2,The sun is a star,true_false,True,False,,,A`}
                      value={csvText}
                      onChange={(e) => setCsvText(e.target.value)}
                      className="font-mono text-xs min-h-[120px]"
                    />
                  </div>

                  <div className="bg-muted/50 rounded-md p-3">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      <strong className="text-foreground">CSV Format:</strong> id, question, type (mcq/true_false/short_answer), choice_a, choice_b, choice_c, choice_d, answer (A/B/C/D or text)
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Settings className="w-4 h-4" />
                    Game Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="timeLimit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Game Time (seconds)</FormLabel>
                          <FormControl>
                            <Input
                              data-testid="input-time-limit"
                              type="number"
                              {...field}
                              onChange={e => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="answerWindow"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Answer Time (seconds)</FormLabel>
                          <FormControl>
                            <Input
                              data-testid="input-answer-window"
                              type="number"
                              {...field}
                              onChange={e => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="correctPull"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Correct Pull Strength</FormLabel>
                          <FormControl>
                            <Input
                              data-testid="input-correct-pull"
                              type="number"
                              {...field}
                              onChange={e => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="wrongPenalty"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Wrong Penalty</FormLabel>
                          <FormControl>
                            <Input
                              data-testid="input-wrong-penalty"
                              type="number"
                              {...field}
                              onChange={e => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="stunDuration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stun Duration (seconds)</FormLabel>
                          <FormControl>
                            <Input
                              data-testid="input-stun-duration"
                              type="number"
                              {...field}
                              onChange={e => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="shuffleQuestions"
                      render={({ field }) => (
                        <FormItem className="flex flex-col justify-end">
                          <FormLabel>Shuffle Questions</FormLabel>
                          <FormControl>
                            <Switch
                              data-testid="switch-shuffle"
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <Button
                data-testid="button-create-game"
                type="submit"
                className="w-full"
                size="lg"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Game Room"
                )}
              </Button>
            </motion.div>
          </form>
        </Form>
      </div>
    </div>
  );
}
