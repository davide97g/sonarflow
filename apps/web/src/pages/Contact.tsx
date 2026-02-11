import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Github, Mail, MessageCircle, ExternalLink, Linkedin } from "lucide-react";

const PROFILE = {
  name: "Davide Ghiotto",
  email: "dghiotto.careers@gmail.com",
  linkedinUrl: "https://www.linkedin.com/in/davide-ghiotto/",
  avatarSrc: "/davide-ghiotto-avatar.png",
} as const;

const Contact = () => {
  return (
    <div className="min-h-screen py-12">
      <div className="container px-4 md:px-8 max-w-4xl">
        <PageHeader
          title="Get in Touch"
          subtitle="Connect with the Sonarflow community"
          centered
        />

        <Card className="mb-8 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <Avatar className="h-24 w-24 ring-2 ring-primary/20">
                <AvatarImage src={PROFILE.avatarSrc} alt={PROFILE.name} />
                <AvatarFallback className="text-xl">{PROFILE.name.slice(0, 2)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 text-center sm:text-left space-y-2">
                <h2 className="text-2xl font-bold">{PROFILE.name}</h2>
                <a
                  href={`mailto:${PROFILE.email}`}
                  className="flex items-center justify-center sm:justify-start gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Mail className="h-4 w-4 shrink-0" aria-hidden />
                  <span>{PROFILE.email}</span>
                </a>
                <a
                  href={PROFILE.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-primary hover:underline"
                  aria-label={`Connect with ${PROFILE.name} on LinkedIn`}
                >
                  <Linkedin className="h-5 w-5" aria-hidden />
                  <span>LinkedIn</span>
                  <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
              </div>
              <a
                href={PROFILE.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto"
              >
                <Button variant="default" className="gap-2 w-full sm:w-auto" aria-label="Open LinkedIn profile">
                  <Linkedin className="h-4 w-4" />
                  Connect on LinkedIn
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Github className="h-5 w-5" />
                GitHub
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Report bugs, request features, or contribute to the project on GitHub.
              </p>
              <a
                href="https://github.com/davide97g/sonarflow"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="w-full gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Visit Repository
                </Button>
              </a>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                GitHub Discussions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Join the community discussions, ask questions, and share your experiences.
              </p>
              <a
                href="https://github.com/davide97g/sonarflow/discussions"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="w-full gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Join Discussions
                </Button>
              </a>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Support
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                For business inquiries or direct support, reach out via email.
              </p>
              <a href={`mailto:${PROFILE.email}`}>
                <Button className="w-full gap-2">
                  <Mail className="h-4 w-4" />
                  Send Email
                </Button>
              </a>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5" />
                Sonarflow Website
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Visit the official Sonarflow website for more information and resources.
              </p>
              <a
                href="https://www.sonarflow.dev"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="w-full gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Visit Website
                </Button>
              </a>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-8 bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
          <CardHeader>
            <CardTitle>Community Guidelines</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>Be respectful and constructive in all communications</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>Search existing issues before creating new ones</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>Provide detailed information when reporting bugs</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>Help others in the community when you can</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <div className="mt-12 text-center">
          <h2 className="text-2xl font-bold mb-4">Project Information</h2>
          <div className="grid gap-4 md:grid-cols-3 text-sm">
            <Card>
              <CardContent className="pt-6">
                <div className="text-muted-foreground mb-1">License</div>
                <div className="font-semibold">MIT</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-muted-foreground mb-1">Built With</div>
                <div className="font-semibold">Node.js & TypeScript</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-muted-foreground mb-1">Maintained By</div>
                <div className="font-semibold">{PROFILE.name}</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
