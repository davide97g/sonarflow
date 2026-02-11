import {
  Bot,
  CheckCircle2,
  Code2,
  Plug,
  ListChecks,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { useCallback } from "react";
import { Link } from "react-router-dom";
import CodeBlock from "@/components/CodeBlock";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

const CURSOR_CONFIG_NPX = `{
  "mcpServers": {
    "sonarflow": {
      "command": "npx",
      "args": ["sonarflow", "mcp", "start"]
    }
  }
}`;

const CURSOR_CONFIG_LOCAL = `{
  "mcpServers": {
    "sonarflow": {
      "command": "node",
      "args": ["node_modules/sonarflow/dist/mcp/server.js"]
    }
  }
}`;

const tools = [
  {
    name: "sonarflow_fetch",
    description: "Run fetch (branch/PR), get issue count and quality gate summary.",
  },
  {
    name: "sonarflow_get_issues",
    description: "Read issues with optional filters: severity, file, rule, limit.",
  },
  {
    name: "sonarflow_get_issues_by_file",
    description: "Issues grouped by file for fix-by-file workflows.",
  },
  {
    name: "sonarflow_get_quality_gate",
    description: "Read quality gate status and conditions.",
  },
  {
    name: "sonarflow_get_measures",
    description: "Read metrics (coverage, duplication, violations).",
  },
  {
    name: "sonarflow_get_config",
    description: "Read .sonarflowrc.json (rulePath, outputPath, etc.).",
  },
  {
    name: "sonarflow_get_autofix_rule",
    description: "Read the autofix rule file from config.",
  },
  {
    name: "sonarflow_check_setup",
    description: "Check if project is initialized and has fetched data.",
  },
];

const AddToCursor = () => {
  const handleAddToCursor = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(CURSOR_CONFIG_NPX);
      toast({
        title: "Config copied",
        description: "MCP config is in your clipboard. Opening Cursor — paste in Settings → MCP if needed.",
      });
      window.location.href = "cursor://";
    } catch {
      toast({
        title: "Copy failed",
        description: "Could not copy config. Use the code block below to copy manually.",
        variant: "destructive",
      });
    }
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/40">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-background" />
        <div className="container relative px-4 py-16 md:py-24 md:px-8">
          <div className="mx-auto max-w-3xl text-center space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <Plug className="h-4 w-4" aria-hidden />
              Model Context Protocol
            </div>
            <h1
              className="text-3xl font-bold tracking-tight md:text-5xl"
              style={{
                textShadow:
                  "0 1px 3px rgba(0,0,0,0.9), 0 0 24px rgba(0,0,0,0.5)",
              }}
            >
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                MCP
              </span>
            </h1>
            <p
              className="text-lg text-white/95"
              style={{
                textShadow:
                  "0 1px 2px rgba(0,0,0,0.85), 0 0 12px rgba(0,0,0,0.4)",
              }}
            >
              Use the Model Context Protocol so Cursor’s AI can fetch issues, read config, and fix
              SonarQube findings without leaving the editor.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Button
                size="lg"
                className="text-base px-8 gap-2"
                onClick={handleAddToCursor}
                type="button"
              >
                <Plug className="h-4 w-4" aria-hidden />
                Add to Cursor
              </Button>
              <a
                href="https://docs.cursor.com/context/model-context-protocol"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Learn about MCP on Cursor Docs
                <ExternalLink className="h-4 w-4" aria-hidden />
              </a>
            </div>
          </div>
        </div>
      </section>

      <div className="container px-4 md:px-8 py-12 md:py-16 max-w-4xl">
        {/* What is MCP */}
        <section className="mb-16">
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-primary" aria-hidden />
                </div>
                <CardTitle className="text-xl">What is MCP?</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                The <strong className="text-foreground">Model Context Protocol (MCP)</strong> is an
                open standard that lets AI assistants connect to external tools and data. Cursor
                supports MCP servers: you run a small process (e.g. <code className="px-1.5 py-0.5 rounded bg-muted text-foreground text-sm">sonarflow mcp start</code>)
                that speaks over stdin/stdout, and Cursor’s AI can call your tools—like “fetch
                Sonar issues” or “get issues for this file”—without you running terminal commands.
              </p>
              <p>
                Sonarflow’s MCP server exposes tools that read your config, run fetch, and return
                issues and quality gate data so the AI can suggest fixes or explain results.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* How to add to Cursor */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-primary" aria-hidden />
            How to add Sonarflow to Cursor
          </h2>

          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Step 1: Install and set up Sonarflow</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-muted-foreground">
                  In your project, run init and fetch at least once so the MCP server has config and
                  issue data.
                </p>
                <div className="space-y-2">
                  <CodeBlock code="npx sonarflow init" />
                  <CodeBlock code="npx sonarflow fetch" />
                </div>
                <p className="text-sm text-muted-foreground">
                  See the <Link to="/get-started" className="text-primary hover:underline">Get Started</Link> page for
                  full setup (.env, etc.).
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Step 2: Open Cursor MCP settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-muted-foreground">
                  In Cursor: <strong className="text-foreground">Settings → MCP</strong>, or edit your
                  MCP config file (e.g. <code className="px-1.5 py-0.5 rounded bg-muted text-sm">.cursor/mcp.json</code> in the project
                  or your user config).
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Step 3: Add the Sonarflow server</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Add a server named <code className="px-1.5 py-0.5 rounded bg-muted text-sm">sonarflow</code>. Use
                  <strong className="text-foreground"> npx</strong> (recommended) so Cursor runs the
                  latest Sonarflow:
                </p>
                <CodeBlock code={CURSOR_CONFIG_NPX} language="json" />
                <p className="text-sm text-muted-foreground">
                  If Sonarflow is installed locally in the project, you can use:
                </p>
                <CodeBlock code={CURSOR_CONFIG_LOCAL} language="json" />
                <p className="text-sm text-muted-foreground">
                  Save the config. Cursor will spawn <code className="px-1.5 py-0.5 rounded bg-muted text-sm">npx sonarflow mcp start</code> and
                  communicate over stdio. The AI will then have access to all Sonarflow tools.
                </p>
                <p className="text-sm text-muted-foreground">
                  By default the server uses the current working directory to find <code className="px-1.5 py-0.5 rounded bg-muted text-sm">.sonarflowrc.json</code>.
                  If your config is elsewhere, set <code className="px-1.5 py-0.5 rounded bg-muted text-sm">env.SONARFLOW_CONFIG_PATH</code> to the path to your config file, or add <code className="px-1.5 py-0.5 rounded bg-muted text-sm">--config-path &lt;path&gt;</code> to the args.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* How to use */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Code2 className="h-6 w-6 text-primary" aria-hidden />
            How to use it
          </h2>
          <Card className="border-border/50">
            <CardContent className="pt-6 space-y-4 text-muted-foreground">
              <p>
                Once the server is added, you don’t run MCP commands yourself. In chat or
                composer, you can ask Cursor to:
              </p>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li>“Fetch the latest Sonar issues for this branch”</li>
                <li>“Show me Sonar issues in this file”</li>
                <li>“What’s the quality gate status?”</li>
                <li>“Fix the Sonar issues in this file using the autofix rule”</li>
              </ul>
              <p>
                Cursor will call the right Sonarflow tools, get the data, and use it in its
                answers or edits. All tools use your project root as the working directory, so
                they read the same <code className="px-1.5 py-0.5 rounded bg-muted text-sm">.sonarflowrc.json</code> and{" "}
                <code className="px-1.5 py-0.5 rounded bg-muted text-sm">.sonarflow/</code> output as the CLI.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Tools */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <ListChecks className="h-6 w-6 text-primary" aria-hidden />
            Tools provided by Sonarflow
          </h2>
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/30">
                    <th className="text-left font-semibold p-4">Tool</th>
                    <th className="text-left font-semibold p-4">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {tools.map((tool) => (
                    <tr
                      key={tool.name}
                      className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors"
                    >
                      <td className="p-4 font-mono text-primary">{tool.name}</td>
                      <td className="p-4 text-muted-foreground">{tool.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center py-8">
          <p className="text-muted-foreground mb-4">New to Sonarflow? Set up the CLI first.</p>
          <Link to="/get-started">
            <Button size="lg" className="gap-2">
              Get Started
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </Link>
        </section>
      </div>
    </div>
  );
};

export default AddToCursor;
