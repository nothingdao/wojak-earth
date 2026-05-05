import React, { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import mermaid from 'mermaid';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

const Mermaid = ({ chart }) => {
  const [svg, setSvg] = useState('');

  useEffect(() => {
    if (chart) {
      try {
        mermaid.render('mermaid-svg', chart).then(({ svg }) => {
          setSvg(svg);
        });
      } catch (error) {
        console.error("Mermaid rendering error:", error);
        setSvg('<pre>Error rendering Mermaid diagram.</pre>');
      }
    }
  }, [chart]);

  return <div dangerouslySetInnerHTML={{ __html: svg }} />;
};

const DocsViewer = ({ onClose }) => {
  const [docManifest, setDocManifest] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [docContent, setDocContent] = useState('');

  useEffect(() => {
    fetch('/docs/manifest.json')
      .then(res => res.json())
      .then(data => {
        setDocManifest(data);
        if (data.length > 0) {
          setSelectedDoc(data[0]);
        }
      })
      .catch(err => console.error('Error fetching doc manifest:', err));
  }, []);

  useEffect(() => {
    if (selectedDoc) {
      fetch(`/docs/${selectedDoc.filename}`)
        .then(res => res.text())
        .then(data => setDocContent(data))
        .catch(err => console.error(`Error fetching ${selectedDoc.filename}:`, err));
    }
  }, [selectedDoc]);

  const groupedDocs = useMemo(() => {
    const groups = {};
    docManifest.forEach(doc => {
      const section = doc.section || 'Uncategorized';
      if (!groups[section]) {
        groups[section] = [];
      }
      groups[section].push(doc);
    });
    return groups;
  }, [docManifest]);

  const markdownComponents = {
    h1: ({ node, ...props }) => <h1 className="text-4xl font-bold mt-8 mb-4" {...props} />,
    h2: ({ node, ...props }) => <h2 className="text-3xl font-semibold mt-6 mb-3" {...props} />,
    h3: ({ node, ...props }) => <h3 className="text-2xl font-semibold mt-4 mb-2" {...props} />,
    p: ({ node, ...props }) => <p className="leading-7 [&:not(:first-child)]:mt-6" {...props} />,
    a: ({ node, ...props }) => <a className="text-primary underline" {...props} />,
    ul: ({ node, ...props }) => <ul className="my-6 ml-6 list-disc [&>li]:mt-2" {...props} />,
    ol: ({ node, ...props }) => <ol className="my-6 ml-6 list-decimal [&>li]:mt-2" {...props} />,
    code: ({ node, inline, className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || '');
      const lang = match?.[1];

      if (lang === 'mermaid') {
        return <Mermaid chart={String(children)} />;
      }

      return !inline ? (
        <SyntaxHighlighter
          style={atomDark}
          language={lang}
          PreTag="div"
          className="text-sm font-light font-mono"
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className="bg-muted text-muted-foreground font-mono p-1 rounded-sm text-sm font-light" {...props}>
          {children}
        </code>
      );
    },
    blockquote: ({ node, ...props }) => <blockquote className="mt-6 border-l-2 pl-6 italic" {...props} />,
  };

  return (
    <div className="fixed inset-0 bg-background flex flex-col z-50">
      <div className="flex items-center justify-between p-6 border-b">
        <h1 className="text-2xl font-bold">Documentation</h1>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-6 w-6" />
        </Button>
      </div>
      <div className="flex-1 flex overflow-hidden">
        <aside className="w-1/4 border-r overflow-y-auto p-4">
          <nav className="flex flex-col space-y-1">
            {Object.keys(groupedDocs).sort().map(section => (
              <div key={section} className="mb-4">
                <h3 className="text-lg font-semibold mb-2">{section}</h3>
                {groupedDocs[section].map(doc => (
                  <Button
                    key={doc.filename}
                    variant={selectedDoc?.filename === doc.filename ? 'secondary' : 'ghost'}
                    className="justify-start w-full"
                    onClick={() => setSelectedDoc(doc)}
                  >
                    {doc.title}
                  </Button>
                ))}
              </div>
            ))}
          </nav>
        </aside>
        <ScrollArea className="flex-1 p-6">
          <div className="prose dark:prose-invert max-w-none">
            <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
              {docContent}
            </ReactMarkdown>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default DocsViewer;