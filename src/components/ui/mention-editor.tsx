import React, { useMemo, useEffect, useRef, useState } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import "quill-mention/dist/quill.mention.css";
import { Skeleton } from "./skeleton";

export interface MentionUser {
  id: string;
  value: string;
  email?: string;
}

interface MentionEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  users: MentionUser[];
  className?: string;
  minHeight?: string;
}

export function MentionEditor({
  value,
  onChange,
  placeholder = "Digite aqui... Use @ para mencionar alguém",
  users,
  className = "",
  minHeight = "120px",
}: MentionEditorProps) {
  const quillRef = useRef<ReactQuill>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  // Dynamically import and register quill-mention before mounting the editor
  useEffect(() => {
    let mounted = true;

    const initMention = async () => {
      try {
        // Dynamic import ensures quill-mention registers with Quill
        await import("quill-mention");
        
        // Small delay to ensure registration completes
        await new Promise(resolve => setTimeout(resolve, 50));
        
        if (mounted) {
          setReady(true);
        }
      } catch (err) {
        console.error("Failed to load quill-mention:", err);
        if (mounted) {
          setError(true);
        }
      }
    };

    initMention();

    return () => {
      mounted = false;
    };
  }, []);

  // Usar ref para sempre ter acesso à versão mais atual sem causar re-render
  const usersRef = useRef(users);
  usersRef.current = users;

  const modules = useMemo(() => ({
    toolbar: [
      ["bold", "italic", "underline"],
      [{ list: "ordered" }, { list: "bullet" }],
      ["link"],
      ["clean"],
    ],
    mention: {
      allowedChars: /^[A-Za-zÀ-ÿ\s]*$/,
      mentionDenotationChars: ["@"],
      showDenotationChar: true,
      spaceAfterInsert: true,
      defaultMenuOrientation: "bottom",
      source: function (
        searchTerm: string,
        renderList: (matches: MentionUser[], searchTerm: string) => void,
        mentionChar: string
      ) {
        const currentUsers = usersRef.current;
        if (searchTerm.length === 0) {
          renderList(currentUsers.slice(0, 10), searchTerm);
        } else {
          const matches = currentUsers.filter((user) =>
            user.value.toLowerCase().includes(searchTerm.toLowerCase())
          );
          renderList(matches.slice(0, 10), searchTerm);
        }
      },
      renderItem: function (item: MentionUser, searchTerm: string) {
        return `<div class="mention-item">
          <span class="mention-name">${item.value}</span>
          ${item.email ? `<span class="mention-email">${item.email}</span>` : ''}
        </div>`;
      },
    },
  }), []); // Array vazio - modules nunca recriam

  const formats = useMemo(() => [
    "bold",
    "italic",
    "underline",
    "list",
    "bullet",
    "link",
    "mention",
  ], []);

  // Aplicar estilos customizados
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      .ql-mention-list-container {
        background: hsl(var(--background));
        border: 1px solid hsl(var(--border));
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 9999;
        max-height: 200px;
        overflow-y: auto;
      }
      
      .ql-mention-list {
        list-style: none;
        margin: 0;
        padding: 4px;
      }
      
      .ql-mention-list-item {
        padding: 8px 12px;
        cursor: pointer;
        border-radius: 6px;
        transition: background 0.15s;
      }
      
      .ql-mention-list-item:hover,
      .ql-mention-list-item.selected {
        background: hsl(var(--accent));
      }
      
      .mention-item {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      
      .mention-name {
        font-weight: 500;
        color: hsl(var(--foreground));
        font-size: 14px;
      }
      
      .mention-email {
        font-size: 12px;
        color: hsl(var(--muted-foreground));
      }
      
      .mention {
        background-color: hsl(var(--primary) / 0.15);
        color: hsl(var(--primary));
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: 500;
        cursor: default;
      }
      
      .mention-editor .ql-container {
        min-height: ${minHeight};
        font-size: 14px;
      }
      
      .mention-editor .ql-editor {
        min-height: ${minHeight};
      }
      
      .mention-editor .ql-toolbar {
        border-top-left-radius: 8px;
        border-top-right-radius: 8px;
        border-color: hsl(var(--border));
        background: hsl(var(--muted) / 0.3);
      }
      
      .mention-editor .ql-container {
        border-bottom-left-radius: 8px;
        border-bottom-right-radius: 8px;
        border-color: hsl(var(--border));
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, [minHeight]);

  // Show loading state while quill-mention is being loaded
  if (!ready) {
    return (
      <div className={`mention-editor ${className}`}>
        <div 
          className="border border-border rounded-lg overflow-hidden"
          style={{ minHeight }}
        >
          <Skeleton className="h-10 rounded-none" />
          <div className="p-3">
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  // Show fallback textarea if quill-mention failed to load
  if (error) {
    return (
      <div className={`mention-editor ${className}`}>
        <textarea
          value={value.replace(/<[^>]*>/g, '')}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full p-3 border border-border rounded-lg min-h-[120px] resize-y bg-background text-foreground"
          style={{ minHeight }}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Editor simplificado (menções indisponíveis)
        </p>
      </div>
    );
  }

  return (
    <div className={`mention-editor ${className}`}>
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
      />
    </div>
  );
}
