import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Youtube, Globe } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateSource } from '@/hooks/useSources';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function NewSourceModal({ open, onClose }: Props) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const create = useCreateSource();

  const [textTitle, setTextTitle] = useState('');
  const [textBody, setTextBody] = useState('');
  const [textOutputs, setTextOutputs] = useState({ flashcards: true, summary: true });

  const [pdfTitle, setPdfTitle] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfOutputs, setPdfOutputs] = useState({ flashcards: true, summary: true });
  const pdfRef = useRef<HTMLInputElement>(null);

  const [imgTitle, setImgTitle] = useState('');
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [imgFiles, setImgFiles] = useState<File[]>([]);
  const [imgMultiple, setImgMultiple] = useState(false);
  const [imgOutputs, setImgOutputs] = useState({ flashcards: true, summary: true });
  const imgRef = useRef<HTMLInputElement>(null);

  const [ytTitle, setYtTitle] = useState('');
  const [ytUrl, setYtUrl] = useState('');
  const [ytOutputs, setYtOutputs] = useState({ flashcards: true, summary: true });
  const [ytUrlError, setYtUrlError] = useState('');

  const [urlTitle, setUrlTitle] = useState('');
  const [urlHref, setUrlHref] = useState('');
  const [urlOutputs, setUrlOutputs] = useState({ flashcards: true, summary: true });

  function outputsArray(o: { flashcards: boolean; summary: boolean }) {
    const arr: string[] = [];
    if (o.flashcards) arr.push('flashcards');
    if (o.summary) arr.push('summary');
    return arr;
  }

  function close() {
    setTextTitle(''); setTextBody('');
    setPdfTitle(''); setPdfFile(null);
    setImgTitle(''); setImgFile(null); setImgFiles([]); setImgMultiple(false);
    setYtTitle(''); setYtUrl(''); setYtUrlError('');
    setUrlTitle(''); setUrlHref('');
    onClose();
  }

  const YT_RE = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i;

  async function submitUrl() {
    if (!urlHref.trim()) return;
    try {
      const res = await create.mutateAsync({
        type: 'url',
        body: { ...(urlTitle ? { title: urlTitle } : {}), url: urlHref, outputs: outputsArray(urlOutputs) },
      });
      close();
      navigate(`/sources/${res.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast({ title: 'Failed to fetch article', description: msg, variant: 'destructive' });
    }
  }

  async function submitYoutube() {
    if (!YT_RE.test(ytUrl)) {
      setYtUrlError('Please enter a valid YouTube URL.');
      return;
    }
    setYtUrlError('');
    try {
      const res = await create.mutateAsync({
        type: 'youtube',
        body: {
          ...(ytTitle ? { title: ytTitle } : {}),
          url: ytUrl,
          outputs: outputsArray(ytOutputs),
        },
      });
      close();
      navigate(`/sources/${res.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast({ title: 'Failed to add YouTube source', description: msg, variant: 'destructive' });
    }
  }

  async function submitText() {
    if (!textBody.trim()) return;
    try {
      const res = await create.mutateAsync({
        type: 'text',
        body: {
          title: textTitle || undefined,
          text: textBody,
          outputs: outputsArray(textOutputs),
        },
      });
      close();
      navigate(`/sources/${res.id}`);
    } catch {
      toast({ title: 'Failed to create source', variant: 'destructive' });
    }
  }

  async function submitPdf() {
    if (!pdfFile) return;
    const fd = new FormData();
    fd.append('file', pdfFile);
    if (pdfTitle) fd.append('title', pdfTitle);
    fd.append('outputs', JSON.stringify(outputsArray(pdfOutputs)));
    try {
      const res = await create.mutateAsync({ type: 'pdf', formData: fd });
      close();
      navigate(`/sources/${res.id}`);
    } catch {
      toast({ title: 'Failed to upload PDF', variant: 'destructive' });
    }
  }

  async function submitImage() {
    try {
      if (imgMultiple) {
        if (imgFiles.length === 0) return;
        const fd = new FormData();
        imgFiles.forEach((f) => fd.append('files', f));
        if (imgTitle) fd.append('title', imgTitle);
        fd.append('outputs', JSON.stringify(outputsArray(imgOutputs)));
        const res = await create.mutateAsync({ type: 'images', formData: fd });
        close();
        navigate(`/sources/${res.id}`);
      } else {
        if (!imgFile) return;
        const fd = new FormData();
        fd.append('file', imgFile);
        if (imgTitle) fd.append('title', imgTitle);
        fd.append('outputs', JSON.stringify(outputsArray(imgOutputs)));
        const res = await create.mutateAsync({ type: 'image', formData: fd });
        close();
        navigate(`/sources/${res.id}`);
      }
    } catch {
      toast({ title: 'Failed to upload image', variant: 'destructive' });
    }
  }

  const busy = create.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>New source</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="text" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="text" className="flex-1">Text</TabsTrigger>
            <TabsTrigger value="pdf" className="flex-1">PDF</TabsTrigger>
            <TabsTrigger value="image" className="flex-1">Image</TabsTrigger>
            <TabsTrigger value="youtube" className="flex-1">YouTube</TabsTrigger>
            <TabsTrigger value="url" className="flex-1">URL</TabsTrigger>
          </TabsList>

          {/* Text tab */}
          <TabsContent value="text" className="mt-4 space-y-4">
            <div>
              <Label htmlFor="text-title">Title (optional)</Label>
              <Input
                id="text-title"
                value={textTitle}
                onChange={(e) => setTextTitle(e.target.value)}
                placeholder="e.g. Chapter 4 notes"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="text-body">Content</Label>
              <textarea
                id="text-body"
                value={textBody}
                onChange={(e) => setTextBody(e.target.value)}
                placeholder="Paste your notes here..."
                rows={8}
                className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent resize-none"
              />
            </div>
            <OutputCheckboxes outputs={textOutputs} onChange={setTextOutputs} />
            <Button
              onClick={submitText}
              disabled={!textBody.trim() || busy}
              className="w-full"
            >
              {busy ? 'Generating…' : 'Generate'}
            </Button>
          </TabsContent>

          {/* PDF tab */}
          <TabsContent value="pdf" className="mt-4 space-y-4">
            <div>
              <Label htmlFor="pdf-title">Title (optional)</Label>
              <Input
                id="pdf-title"
                value={pdfTitle}
                onChange={(e) => setPdfTitle(e.target.value)}
                placeholder="e.g. Lecture slides"
                className="mt-1"
              />
            </div>
            <div>
              <Label>PDF file</Label>
              <div
                className="mt-1 flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border bg-bg p-8 text-sm text-muted hover:border-accent transition-colors"
                onClick={() => pdfRef.current?.click()}
              >
                {pdfFile ? pdfFile.name : 'Click to choose a PDF (max 10 MB)'}
              </div>
              <input
                ref={pdfRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <OutputCheckboxes outputs={pdfOutputs} onChange={setPdfOutputs} />
            <Button
              onClick={submitPdf}
              disabled={!pdfFile || busy}
              className="w-full"
            >
              {busy ? 'Generating…' : 'Generate'}
            </Button>
          </TabsContent>

          {/* Image tab */}
          <TabsContent value="image" className="mt-4 space-y-4">
            <div>
              <Label htmlFor="img-title">Title (optional)</Label>
              <Input
                id="img-title"
                value={imgTitle}
                onChange={(e) => setImgTitle(e.target.value)}
                placeholder="e.g. Whiteboard photo"
                className="mt-1"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-fg cursor-pointer">
              <input
                type="checkbox"
                checked={imgMultiple}
                onChange={(e) => { setImgMultiple(e.target.checked); setImgFile(null); setImgFiles([]); }}
                className="accent-accent"
              />
              Select multiple (slide deck)
            </label>
            {imgMultiple ? (
              <div>
                <Label>Image files (up to 10)</Label>
                <div
                  className="mt-1 flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border bg-bg p-6 text-sm text-muted hover:border-accent transition-colors"
                  onClick={() => imgRef.current?.click()}
                >
                  {imgFiles.length > 0 ? `${imgFiles.length} files selected` : 'Click to choose images'}
                </div>
                {imgFiles.length > 0 && (
                  <div className="mt-2 grid grid-cols-4 gap-2">
                    {imgFiles.map((f, i) => (
                      <div key={i} className="relative group">
                        <img
                          src={URL.createObjectURL(f)}
                          alt={f.name}
                          className="h-16 w-full rounded object-cover border border-border"
                        />
                        <button
                          onClick={() => setImgFiles((prev) => prev.filter((_, j) => j !== i))}
                          className="absolute -right-1 -top-1 hidden group-hover:flex h-5 w-5 items-center justify-center rounded-full bg-warn text-white text-xs"
                        >×</button>
                      </div>
                    ))}
                  </div>
                )}
                <input
                  ref={imgRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/heic"
                  multiple
                  className="hidden"
                  onChange={(e) => setImgFiles(Array.from(e.target.files ?? []))}
                />
              </div>
            ) : (
              <div>
                <Label>Image file</Label>
                <div
                  className="mt-1 flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border bg-bg p-8 text-sm text-muted hover:border-accent transition-colors"
                  onClick={() => imgRef.current?.click()}
                >
                  {imgFile ? imgFile.name : 'Click to choose an image (max 8 MB)'}
                </div>
                <input
                  ref={imgRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/heic"
                  className="hidden"
                  onChange={(e) => setImgFile(e.target.files?.[0] ?? null)}
                />
              </div>
            )}
            <OutputCheckboxes outputs={imgOutputs} onChange={setImgOutputs} />
            <Button
              onClick={submitImage}
              disabled={(imgMultiple ? imgFiles.length === 0 : !imgFile) || busy}
              className="w-full"
            >
              {busy ? 'Generating…' : 'Generate'}
            </Button>
          </TabsContent>

          {/* YouTube tab */}
          <TabsContent value="youtube" className="mt-4 space-y-4">
            <div>
              <Label htmlFor="yt-title">Title (optional)</Label>
              <Input
                id="yt-title"
                value={ytTitle}
                onChange={(e) => setYtTitle(e.target.value)}
                placeholder="e.g. MIT 6.006 Lecture 1"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="yt-url">YouTube URL</Label>
              <div className="relative mt-1">
                <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
                <Input
                  id="yt-url"
                  value={ytUrl}
                  onChange={(e) => { setYtUrl(e.target.value); setYtUrlError(''); }}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="pl-9"
                />
              </div>
              {ytUrlError && <p className="mt-1 text-xs text-warn">{ytUrlError}</p>}
            </div>
            <OutputCheckboxes outputs={ytOutputs} onChange={setYtOutputs} />
            <Button
              onClick={submitYoutube}
              disabled={!ytUrl.trim() || busy}
              className="w-full"
            >
              {busy ? 'Generating…' : 'Generate'}
            </Button>
          </TabsContent>
          {/* URL tab */}
          <TabsContent value="url" className="mt-4 space-y-4">
            <div>
              <Label htmlFor="url-title">Title (optional)</Label>
              <Input
                id="url-title"
                value={urlTitle}
                onChange={(e) => setUrlTitle(e.target.value)}
                placeholder="e.g. React Hooks Guide"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="url-href">Article URL</Label>
              <div className="relative mt-1">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                <Input
                  id="url-href"
                  value={urlHref}
                  onChange={(e) => setUrlHref(e.target.value)}
                  placeholder="https://..."
                  className="pl-9"
                />
              </div>
            </div>
            <OutputCheckboxes outputs={urlOutputs} onChange={setUrlOutputs} />
            <Button
              onClick={submitUrl}
              disabled={!urlHref.trim() || busy}
              className="w-full"
            >
              {busy ? 'Generating…' : 'Generate'}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function OutputCheckboxes({
  outputs,
  onChange,
}: {
  outputs: { flashcards: boolean; summary: boolean };
  onChange: (v: { flashcards: boolean; summary: boolean }) => void;
}) {
  return (
    <div className="flex gap-4 text-sm text-fg">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={outputs.flashcards}
          onChange={(e) => onChange({ ...outputs, flashcards: e.target.checked })}
          className="accent-accent"
        />
        Flashcards
      </label>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={outputs.summary}
          onChange={(e) => onChange({ ...outputs, summary: e.target.checked })}
          className="accent-accent"
        />
        Summary
      </label>
    </div>
  );
}
