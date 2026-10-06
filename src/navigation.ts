const base = import.meta.env.BASE_URL;

export function routeHref(path: string): string {
  return base === '/' ? path : `${base}#${path}`;
}

export function currentRoute(): string {
  if (base === '/') return window.location.pathname + window.location.search;
  return window.location.hash.startsWith('#/') ? window.location.hash.slice(1) : '/';
}

export function imageUrl(file: string): string {
  return `${base}images/${file}`;
}
