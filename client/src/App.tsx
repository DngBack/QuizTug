import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import CreateRoom from "@/pages/create-room";
import JoinRoom from "@/pages/join-room";
import Lobby from "@/pages/lobby";
import Game from "@/pages/game";
import Results from "@/pages/results";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/create" component={CreateRoom} />
      <Route path="/join/:code" component={JoinRoom} />
      <Route path="/lobby/:code" component={Lobby} />
      <Route path="/game/:code" component={Game} />
      <Route path="/results/:code" component={Results} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
