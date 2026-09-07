import { defineEventHandler, getRequestURL, setHeader } from 'h3'
// @ts-ignore
import { useRuntimeConfig } from '#imports'
import { canIndex } from '../../shared/seo'

export default defineEventHandler(event => {
  const path = getRequestURL(event).pathname
  if (!canIndex(useRuntimeConfig().public) || /^\/(admin|carrito|api)(\/|$)/.test(path)) setHeader(event, 'X-Robots-Tag', 'noindex, nofollow')
})
