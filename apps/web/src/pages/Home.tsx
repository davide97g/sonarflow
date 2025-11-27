import {
  Box,
  FileText,
  Github,
  GitPullRequest,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import CodeBlock from "@/components/CodeBlock";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const Home = () => {
  const features = [
    {
      icon: GitPullRequest,
      title: "Automatic PR Detection",
      description: "Automatically fetches issues from your pull requests in GitHub and Bitbucket",
    },
    {
      icon: Search,
      title: "Local Scanning",
      description: "Run SonarQube scans locally on your codebase without server setup",
    },
    {
      icon: Sparkles,
      title: "AI Editor Integration",
      description: "Seamlessly integrates with Cursor, VSCode, and Windsurf editors",
    },
    {
      icon: FileText,
      title: "Issue Summary",
      description: "Get detailed JSON reports of all issues found in your project",
    },
    {
      icon: RefreshCw,
      title: "Update Checking",
      description: "Automatically checks and notifies you of new versions",
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-background" />
        <div className="container relative px-4 py-20 md:py-32 md:px-8">
          <div className="mx-auto max-w-4xl text-center space-y-8">
            <div className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              CLI Utility for Modern Development
            </div>
            <h1 className="text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl">
              Automate SonarQube Issue Management with{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                AI Integration
              </span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground md:text-xl">
              Fetch issues, run local scans, and integrate seamlessly with your AI-powered editor
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/get-started">
                <Button size="lg" className="text-base px-8">
                  Get Started
                </Button>
              </Link>
              <a
                href="https://github.com/davide97g/sonarflow"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="lg" className="text-base px-8">
                  <Github className="mr-2 h-4 w-4" />
                  View on GitHub
                </Button>
              </a>
            </div>

            <div className="mt-12 max-w-xs mx-auto">
              <CodeBlock code="npx sonarflow init" />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-32">
        <div className="container px-4 md:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold md:text-4xl mb-4">Powerful Features</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to streamline your code quality workflow
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={index.toString()}
                  className="border-border/50 transition-all hover:shadow-lg hover:-translate-y-1"
                >
                  <CardContent className="p-6 space-y-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Quick Usage Section */}
      <section className="py-20 md:py-32 bg-muted/30">
        <div className="container px-4 md:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold md:text-4xl mb-4">Quick Usage</h2>
            <p className="text-lg text-muted-foreground">
              Get started in seconds with simple commands
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Fetch Issues</h3>
              <p className="text-muted-foreground">
                Automatically retrieve SonarQube issues from your pull requests
              </p>
              <CodeBlock code="npx sonarflow fetch" />
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Run Local Scan</h3>
              <p className="text-muted-foreground">
                Scan your codebase locally without server setup
              </p>
              <CodeBlock code="npx sonarflow scan" />
            </div>
          </div>
        </div>
      </section>

      {/* Platform Support Section */}
      <section className="py-20 md:py-32">
        <div className="container px-4 md:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold md:text-4xl mb-4">Platform Support</h2>
            <p className="text-lg text-muted-foreground">
              Works seamlessly with your favorite platforms
            </p>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-12 max-w-3xl mx-auto">
            <div className="flex items-center gap-3 text-2xl font-semibold">
              <Github className="h-10 w-10" />
              <span>GitHub</span>
            </div>
            <div className="flex items-center gap-3 text-2xl font-semibold">
              <Box className="h-10 w-10" />
              <span>Bitbucket</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32 bg-gradient-to-br from-primary to-accent text-primary-foreground">
        <div className="container px-4 md:px-8 text-center">
          <h2 className="text-3xl font-bold md:text-4xl mb-4">Why Developers Love Sonarflow</h2>
          <p className="text-lg opacity-90 max-w-2xl mx-auto mb-8">
            Save time, improve code quality, and integrate AI-powered insights directly into your
            workflow
          </p>
          <Link to="/get-started">
            <Button size="lg" variant="secondary" className="text-base px-8">
              Start Using Sonarflow
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
