import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMessageContentProps {
  content: string;
  /** User bubbles use light-on-dark; assistant uses ink on linen (prose). */
  variant?: 'user' | 'assistant';
}

const markdownComponents: Components = {
  h1: ({ children }) => <h1 className="text-base font-semibold mt-3 mb-1.5 first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="text-sm font-semibold mt-3 mb-1.5 first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-semibold mt-2.5 mb-1 first:mt-0">{children}</h3>,
  h4: ({ children }) => <h4 className="text-sm font-medium mt-2 mb-1 first:mt-0">{children}</h4>,
  p: ({ children }) => <p className="my-1.5 first:mt-0 last:mb-0 leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="my-1.5 pl-4 list-disc space-y-0.5">{children}</ul>,
  ol: ({ children }) => <ol className="my-1.5 pl-4 list-decimal space-y-0.5">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  hr: () => <hr className="my-3 border-current/20" />,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
      {children}
    </a>
  ),
  code: ({ children, className }) => {
    const isBlock = Boolean(className);
    if (isBlock) {
      return (
        <code className="block text-xs font-mono whitespace-pre-wrap break-words bg-black/5 rounded-lg px-2 py-1.5 my-2">
          {children}
        </code>
      );
    }
    return <code className="text-xs font-mono bg-black/5 rounded px-1 py-0.5">{children}</code>;
  },
  pre: ({ children }) => <pre className="my-2 overflow-x-auto">{children}</pre>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-current/30 pl-3 my-2 opacity-90">{children}</blockquote>
  ),
  table: ({ children }) => (
    <div className="my-2 -mx-0.5 overflow-x-auto rounded-lg border border-current/15">
      <table className="w-full min-w-[12rem] text-sm border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-black/5">{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr className="border-b border-current/10 last:border-b-0">{children}</tr>,
  th: ({ children, style }) => (
    <th className="px-2.5 py-1.5 font-semibold whitespace-nowrap align-middle" style={style}>
      {children}
    </th>
  ),
  td: ({ children, style }) => (
    <td className="px-2.5 py-1.5 align-middle" style={style}>
      {children}
    </td>
  ),
};

export default function ChatMessageContent({ content, variant = 'assistant' }: ChatMessageContentProps) {
  return (
    <div
      className={`chat-md text-sm break-words ${variant === 'user' ? 'chat-md-user' : 'chat-md-assistant'}`}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
