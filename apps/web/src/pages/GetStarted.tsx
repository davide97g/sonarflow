import { AlertCircle } from "lucide-react";
import CodeBlock from "@/components/CodeBlock";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const GetStarted = () => {
  return (
    <div className="min-h-screen py-12">
      <div className="container px-4 md:px-8 max-w-4xl">
        <PageHeader
          title="Get Started"
          subtitle="Follow these steps to install and configure Sonarflow in your project"
        />

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Install Sonarflow</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Install Sonarflow globally or as a dev dependency:
              </p>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium mb-2">Global Installation:</p>
                  <CodeBlock code="npm install -g sonarflow" />
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Local Installation:</p>
                  <CodeBlock code="npm install --save-dev sonarflow" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Step 2: Initialize Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Run the interactive CLI to set up your configuration:
              </p>
              <CodeBlock code="npx sonarflow init" />
              <p className="text-sm text-muted-foreground">
                This command will guide you through setting up the required environment variables
                and configuration files.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Step 3: Configure Environment Variables</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Create a <code className="px-1 py-0.5 bg-muted rounded">.env</code> file with the
                required tokens:
              </p>
              <CodeBlock
                code={`# Bitbucket Credentials (if using Bitbucket with private repositories)
BITBUCKET_USERNAME=your_username
BITBUCKET_APP_PASSWORD=your_app_password

# SonarQube Configuration
SONAR_TOKEN=your_sonar_token
SONAR_HOST_URL=https://your-sonarqube-instance.com`}
                language="bash"
              />
              <div className="flex gap-2 p-4 bg-accent/10 border border-accent/20 rounded-lg">
                <AlertCircle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                <div className="text-sm space-y-2">
                  <p className="font-medium">Required Access Tokens:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Bitbucket: App password with PR read permissions</li>
                    <li>SonarQube: User token with project analysis permissions</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
            <CardHeader>
              <CardTitle>You're All Set!</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Now you can start using Sonarflow to fetch issues and run scans:
              </p>
              <div className="space-y-3">
                <CodeBlock code="npx sonarflow fetch" />
                <CodeBlock code="npx sonarflow scan" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default GetStarted;
