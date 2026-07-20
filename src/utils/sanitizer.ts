import sanitizeHtml from 'sanitize-html';
import { htmlToText } from 'html-to-text';

export const sanitizeContent = (content: string): string => {
  return sanitizeHtml(content, {
    allowedTags: [
      'p',
      'br',
      'b',
      'i',
      'em',
      'strong',
      'u',
      's',
      'blockquote',
      'code',
      'pre',
      'ul',
      'ol',
      'li',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'hr',
      'a',
    ],
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesAppliedToAttributes: ['href'],
    allowProtocolRelative: false,
    parseStyleAttributes: false,
    transformTags: {
      a: (tagName, attribs) => {
        const href = attribs.href?.trim();

        return {
          tagName,
          attribs: {
            ...(href ? { href } : {}),
            ...(attribs.title ? { title: attribs.title } : {}),
            target: '_blank',
            rel: 'noopener noreferrer',
          },
        };
      },
    },
  });
};

export const countWordsFromHTML = (html: string): number => {
  const text = htmlToText(html, {
    wordwrap: false,
    selectors: [{ selector: 'img', format: 'skip' }],
  });

  const cleaned = text.replace(/\s+/g, ' ').trim();

  if (!cleaned) return 0;

  return cleaned.split(' ').length;
};

/**
 * Normalizes plain text for storage.
 * Safe for titles, descriptions, comments, bios, etc.
 */
export function sanitizeText(text: string): string {
  return (
    text
      // Normalize Unicode
      .normalize('NFKC')

      // Remove control characters (keep \n and \t)
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')

      // Remove zero-width & invisible characters
      .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')

      // Normalize line endings
      .replace(/\r\n?/g, '\n')

      // Replace tabs with spaces
      .replace(/\t/g, ' ')

      // Collapse consecutive spaces
      .replace(/[ ]{2,}/g, ' ')

      // Collapse excessive blank lines
      .replace(/\n{3,}/g, '\n\n')

      // Trim each line
      .split('\n')
      .map((line) => line.trim())
      .join('\n')

      // Trim the entire string
      .trim()
  );
}
