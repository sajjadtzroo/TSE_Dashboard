import { ActionIcon, Code, CopyButton, Text, Tooltip } from '@mantine/core';
import { IconCheck, IconCopy } from '@tabler/icons-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import sql from 'react-syntax-highlighter/dist/esm/languages/prism/sql';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash';
import styles from './ChatDrawer.module.css';

SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('js', javascript);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('py', python);
SyntaxHighlighter.registerLanguage('sql', sql);
SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('bash', bash);
SyntaxHighlighter.registerLanguage('sh', bash);

const SUPPORTED_LANGS = new Set([
  'javascript', 'js', 'python', 'py', 'sql', 'json', 'bash', 'sh',
]);

function CodeBlock({ className, children }) {
  const match = /language-(\w+)/.exec(className || '');
  const lang = match ? match[1] : '';
  const code = String(children).replace(/\n$/, '');

  if (!match) {
    return (
      <Code style={{ direction: 'ltr', fontSize: 13 }}>
        {children}
      </Code>
    );
  }

  return (
    <div className={styles.codeBlockWrapper}>
      {lang && <span className={styles.codeLang}>{lang}</span>}
      <CopyButton value={code} timeout={2000}>
        {({ copied, copy }) => (
          <Tooltip label={copied ? 'Copied' : 'Copy'} position="left">
            <ActionIcon
              className={styles.codeBlockCopy}
              size="xs"
              variant="subtle"
              color={copied ? 'teal' : 'gray'}
              onClick={copy}
            >
              {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
            </ActionIcon>
          </Tooltip>
        )}
      </CopyButton>
      <SyntaxHighlighter
        language={SUPPORTED_LANGS.has(lang) ? lang : 'text'}
        style={oneDark}
        customStyle={{
          background: 'transparent',
          fontSize: 13,
          margin: 0,
        }}
        wrapLongLines
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

const components = {
  code({ className, children, ...props }) {
    const isBlock = /language-/.test(className || '');
    if (isBlock) {
      return <CodeBlock className={className}>{children}</CodeBlock>;
    }
    return (
      <Code style={{ direction: 'ltr', fontSize: 13 }} {...props}>
        {children}
      </Code>
    );
  },

  p({ children }) {
    return (
      <Text size="sm" style={{ direction: 'auto', color: 'inherit' }} component="p">
        {children}
      </Text>
    );
  },

  a({ href, children }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: '#3B82F6' }}
      >
        {children}
      </a>
    );
  },

  table({ children }) {
    return (
      <div className={styles.tableWrapper}>
        <table>{children}</table>
      </div>
    );
  },

  pre({ children }) {
    return <>{children}</>;
  },
};

export default function MarkdownRenderer({ content }) {
  return (
    <div className={styles.markdownContent}>
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </Markdown>
    </div>
  );
}
