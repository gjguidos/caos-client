"use client";

import Image from "next/image";
import type { Components } from "react-markdown";
import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";

interface MessageBubbleProps {
  text: string;
  align?: "left" | "right";
  /** Names the source of the message, above the content. */
  header?: ReactNode;
  /** Sits inside the bubble, under the text - for detail about the message
   * itself, such as the settings a tool invocation carried. Ruled off from the
   * text when there is text to rule it off from. */
  footer?: ReactNode;
  /** Sits outside the bubble, under it - for acting on the message. */
  actions?: ReactNode;
}

const IMG_LINE_RE = /^https?:\/\/.+\.(png|jpg|jpeg|webp|gif)(\?.*)?$/i;
const DATA_URI_RE = /^data:image\/(png|jpeg|webp|gif);base64,.+$/i;
const isImageLine = (line: string) =>
  IMG_LINE_RE.test(line) || DATA_URI_RE.test(line);

type Segment =
  | { type: "image"; src: string }
  | { type: "text"; content: string };

// Split text into image-line segments and text-block segments so images are
// rendered directly (bypassing markdown) while the rest goes through react-markdown.
// This avoids markdown parser issues with special characters in image URLs.
function splitIntoSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  let textBuffer: string[] = [];

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (isImageLine(trimmed)) {
      if (textBuffer.length) {
        segments.push({ type: "text", content: textBuffer.join("\n") });
        textBuffer = [];
      }
      segments.push({ type: "image", src: trimmed });
    } else {
      textBuffer.push(line);
    }
  }

  if (textBuffer.length) {
    segments.push({ type: "text", content: textBuffer.join("\n") });
  }

  return segments;
}

const markdownComponents: Components = {
  // Render fenced code blocks with syntax highlighting; inline code gets subtle styling
  code({ className, children, node: _node, ...props }) {
    const match = /language-(\w+)/.exec(className ?? "");
    if (match) {
      return (
        <SyntaxHighlighter
          language={match[1]}
          PreTag="div"
          style={oneDark}
          className="!my-2 !rounded-lg !text-sm"
        >
          {String(children).replace(/\n$/, "")}
        </SyntaxHighlighter>
      );
    }
    return (
      <code
        className="rounded bg-neutral-2 px-[0.3em] py-[0.15em] font-mono text-sm"
        {...props}
      >
        {children}
      </code>
    );
  },
  // Strip the outer <pre> so SyntaxHighlighter controls its own container
  pre({ children }) {
    return <>{children}</>;
  },
  p({ children }) {
    return (
      <p className="mb-2 text-base leading-relaxed last:mb-0">{children}</p>
    );
  },
  h1({ children }) {
    return (
      <h1 className="mb-3 mt-4 text-xl font-bold first:mt-0">{children}</h1>
    );
  },
  h2({ children }) {
    return (
      <h2 className="mb-2 mt-3 text-lg font-bold first:mt-0">{children}</h2>
    );
  },
  h3({ children }) {
    return (
      <h3 className="mb-2 mt-3 text-base font-bold first:mt-0">{children}</h3>
    );
  },
  ul({ children }) {
    return <ul className="mb-2 list-disc pl-5 text-base">{children}</ul>;
  },
  ol({ children }) {
    return <ol className="mb-2 list-decimal pl-5 text-base">{children}</ol>;
  },
  li({ children }) {
    return <li className="mb-1 leading-relaxed">{children}</li>;
  },
  blockquote({ children }) {
    return (
      <blockquote className="my-2 border-l-4 border-neutral-4 pl-4 italic text-text-2">
        {children}
      </blockquote>
    );
  },
  a({ href, children }) {
    return (
      <a
        href={href}
        className="text-interactive-primary underline hover:opacity-80"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    );
  },
  table({ children }) {
    return (
      <div className="my-2 overflow-x-auto">
        <table className="w-full border-collapse text-sm">{children}</table>
      </div>
    );
  },
  thead({ children }) {
    return <thead className="bg-neutral-2">{children}</thead>;
  },
  th({ children }) {
    return (
      <th className="border border-neutral-3 px-3 py-2 text-left font-bold">
        {children}
      </th>
    );
  },
  td({ children }) {
    return <td className="border border-neutral-3 px-3 py-2">{children}</td>;
  },
  hr() {
    return <hr className="my-4 border-neutral-3" />;
  },
};

function MarkdownContent({ text }: { text: string }) {
  return (
    <>
      {splitIntoSegments(text).map((seg, i) => {
        if (seg.type === "image") {
          return (
            <div key={i} className="my-2">
              <Image
                src={seg.src}
                alt="Generated Visual"
                width={400}
                height={400}
                unoptimized
                className="rounded-lg border"
              />
            </div>
          );
        }
        if (!seg.content.trim()) return null;
        return (
          <ReactMarkdown
            key={i}
            remarkPlugins={[remarkGfm]}
            components={markdownComponents}
          >
            {seg.content}
          </ReactMarkdown>
        );
      })}
    </>
  );
}

export function MessageBubble({
  text,
  align = "left",
  header,
  footer,
  actions,
}: MessageBubbleProps) {
  // Ruled off from the text only when there is text to rule it off from. A
  // caller with nothing to put here passes no footer at all, so there is
  // nothing to guard against beyond that.
  const footerBlock = footer && (
    <div className={text ? "mt-50 border-t border-neutral-3 pt-50" : ""}>
      {footer}
    </div>
  );

  if (align === "right") {
    return (
      <div className="my-1 text-right">
        {header}
        <div className="inline-block max-w-full break-words rounded-[12px] bg-neutral-2 px-6 py-3 text-left md:max-w-lg">
          {text && <MarkdownContent text={text} />}
          {footerBlock}
        </div>
        {actions && <div className="mt-1 flex justify-end">{actions}</div>}
      </div>
    );
  }

  return (
    <div className="my-1 max-w-full break-words text-left md:max-w-lg">
      {header}
      {text && <MarkdownContent text={text} />}
      {footerBlock}
      {actions && (
        <div className="mt-2 flex flex-wrap items-center gap-100">
          {actions}
        </div>
      )}
    </div>
  );
}
