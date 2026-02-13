import sanitizeHtml from 'sanitize-html';

export const sanitizeContent = (content: string): string => {
  return sanitizeHtml(content, {
    allowedTags: ['b', 'i', 'em', 'strong', 'a'],
    allowedAttributes: {
      a: ['href'],
    },
    allowedIframeHostnames: [],
  });
};
