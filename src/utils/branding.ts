export type ServiceBrand = {
  bg: string
  text: string
  border: string
  badgeBg: string
  category: 'Streaming' | 'AI & Tech' | 'Productivity' | 'Music' | 'Cloud & Storage' | 'Design' | 'Gaming' | 'Other'
}

export function getServiceBrand(name: string): ServiceBrand {
  const n = (name || '').toLowerCase()

  if (n.includes('netflix')) {
    return { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30', badgeBg: 'bg-red-500/10 text-red-300', category: 'Streaming' }
  }
  if (n.includes('spotify')) {
    return { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', badgeBg: 'bg-emerald-500/10 text-emerald-300', category: 'Music' }
  }
  if (n.includes('youtube') || n.includes('yt')) {
    return { bg: 'bg-red-600/15', text: 'text-red-500', border: 'border-red-600/30', badgeBg: 'bg-red-600/10 text-red-300', category: 'Streaming' }
  }
  if (n.includes('chatgpt') || n.includes('openai') || n.includes('gpt')) {
    return { bg: 'bg-teal-500/15', text: 'text-teal-300', border: 'border-teal-500/30', badgeBg: 'bg-teal-500/10 text-teal-200', category: 'AI & Tech' }
  }
  if (n.includes('claude') || n.includes('anthropic')) {
    return { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', badgeBg: 'bg-amber-500/10 text-amber-300', category: 'AI & Tech' }
  }
  if (n.includes('github') || n.includes('copilot')) {
    return { bg: 'bg-slate-500/20', text: 'text-slate-200', border: 'border-slate-500/30', badgeBg: 'bg-slate-500/15 text-slate-300', category: 'AI & Tech' }
  }
  if (n.includes('icloud') || n.includes('apple')) {
    return { bg: 'bg-sky-500/15', text: 'text-sky-400', border: 'border-sky-500/30', badgeBg: 'bg-sky-500/10 text-sky-300', category: 'Cloud & Storage' }
  }
  if (n.includes('google') || n.includes('drive') || n.includes('workspace') || n.includes('gemini')) {
    return { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30', badgeBg: 'bg-blue-500/10 text-blue-300', category: 'Productivity' }
  }
  if (n.includes('figma')) {
    return { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30', badgeBg: 'bg-purple-500/10 text-purple-300', category: 'Design' }
  }
  if (n.includes('notion')) {
    return { bg: 'bg-zinc-500/20', text: 'text-zinc-200', border: 'border-zinc-500/30', badgeBg: 'bg-zinc-500/15 text-zinc-300', category: 'Productivity' }
  }
  if (n.includes('disney')) {
    return { bg: 'bg-blue-600/15', text: 'text-blue-400', border: 'border-blue-600/30', badgeBg: 'bg-blue-600/10 text-blue-300', category: 'Streaming' }
  }
  if (n.includes('hbo') || n.includes('max')) {
    return { bg: 'bg-indigo-600/15', text: 'text-indigo-400', border: 'border-indigo-600/30', badgeBg: 'bg-indigo-600/10 text-indigo-300', category: 'Streaming' }
  }
  if (n.includes('playstation') || n.includes('xbox') || n.includes('steam') || n.includes('game')) {
    return { bg: 'bg-green-500/15', text: 'text-green-400', border: 'border-green-500/30', badgeBg: 'bg-green-500/10 text-green-300', category: 'Gaming' }
  }
  if (n.includes('canva') || n.includes('adobe') || n.includes('midjourney')) {
    return { bg: 'bg-fuchsia-500/15', text: 'text-fuchsia-400', border: 'border-fuchsia-500/30', badgeBg: 'bg-fuchsia-500/10 text-fuchsia-300', category: 'Design' }
  }

  // Default neutral tech branding
  return {
    bg: 'bg-indigo-500/15',
    text: 'text-indigo-400',
    border: 'border-indigo-500/20',
    badgeBg: 'bg-indigo-500/10 text-indigo-300',
    category: 'Other',
  }
}
