export function imageWidth(url: string, width: number) {
  if (url.startsWith('https://res.cloudinary.com/')) return url.replace(/\/upload\/(?:f_auto,q_auto,w_\d+\/)?/, `/upload/f_auto,q_auto,w_${width}/`)
  if (url.startsWith('https://images.unsplash.com/')) { const parsed=new URL(url); parsed.searchParams.set('w',String(width)); return parsed.toString() }
  return url
}
export const imageSources = (url: string) => [320,640,960,1200].map(w=>`${imageWidth(url,w)} ${w}w`).join(', ')
