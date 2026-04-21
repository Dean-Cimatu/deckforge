import { Routes, Route } from 'react-router-dom';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function DesignSystemPreview() {
  return (
    <div className="min-h-screen bg-bg p-8">
      <div className="mx-auto max-w-2xl space-y-12">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-serif text-5xl font-semibold text-fg">DeckForge</h1>
            <p className="mt-2 text-base text-muted">Design system preview — Inter body, Fraunces heading</p>
          </div>
          <ThemeToggle />
        </div>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl text-fg">Buttons</h2>
          <div className="flex flex-wrap gap-3">
            <Button variant="default">Generate →</Button>
            <Button variant="outline">Export</Button>
            <Button variant="ghost">Cancel</Button>
            <Button variant="destructive">Delete</Button>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl text-fg">Badges</h2>
          <div className="flex flex-wrap gap-2">
            <Badge variant="default">Accent</Badge>
            <Badge variant="secondary">PDF</Badge>
            <Badge variant="outline">YouTube</Badge>
            <Badge variant="success">Ready</Badge>
            <Badge variant="destructive">Failed</Badge>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl text-fg">Tabs</h2>
          <Tabs defaultValue="summary">
            <TabsList>
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="flashcards">Flashcards</TabsTrigger>
            </TabsList>
            <TabsContent value="summary">
              <p className="text-sm text-muted">Summary tab content</p>
            </TabsContent>
            <TabsContent value="flashcards">
              <p className="text-sm text-muted">Flashcards tab content</p>
            </TabsContent>
          </Tabs>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl text-fg">Form</h2>
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input id="email" type="email" placeholder="you@university.edu" />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl text-fg">Card</h2>
          <Card>
            <CardHeader>
              <CardTitle>Photosynthesis — Biology 1A</CardTitle>
              <CardDescription>14 cards · Generated 2 hours ago</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted">What is the primary pigment used in photosynthesis?</p>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl text-fg">Skeleton</h2>
          <div className="space-y-2">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif text-2xl text-fg">Type scale</h2>
          <p className="font-mono text-sm text-muted">next review in 3 days</p>
        </section>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<DesignSystemPreview />} />
    </Routes>
  );
}
