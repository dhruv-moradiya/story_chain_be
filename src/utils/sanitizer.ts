import sanitizeHtml from 'sanitize-html';

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
