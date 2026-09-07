import { beforeEach, describe, expect, it, vi } from 'vitest'
const verify = vi.hoisted(() => vi.fn())
vi.mock('firebase-admin/app', () => ({ cert:vi.fn(),getApps:()=>[{}],initializeApp:vi.fn() }))
vi.mock('firebase-admin/auth', () => ({ getAuth:()=>({verifyIdToken:verify}) }))
vi.mock('firebase-admin/firestore', () => ({getFirestore:vi.fn()}))
import { requireAdmin } from '../server/utils/firebase'
beforeEach(() => {
  vi.stubGlobal('getHeader',()=> 'Bearer test-token')
  vi.stubGlobal('useRuntimeConfig',()=>({firebaseProjectId:'test',firebaseClientEmail:'test',firebasePrivateKey:'test'}))
  vi.stubGlobal('createError',(data: object)=>Object.assign(new Error('denied'),data))
  verify.mockReset()
})
describe('Permisos de administración',()=>{
  it('rechaza solicitudes sin token',async()=>{vi.stubGlobal('getHeader',()=>undefined);await expect(requireAdmin({} as never)).rejects.toMatchObject({statusCode:401})})
  it('rechaza tokens inválidos o revocados',async()=>{verify.mockRejectedValue(new Error('invalid'));await expect(requireAdmin({} as never)).rejects.toMatchObject({statusCode:401})})
  it('rechaza cuentas autenticadas sin atributo admin',async()=>{verify.mockResolvedValue({uid:'user'});await expect(requireAdmin({} as never)).rejects.toMatchObject({statusCode:403})})
  it('comprueba revocación y permite administradores',async()=>{verify.mockResolvedValue({uid:'admin',admin:true});await expect(requireAdmin({} as never)).resolves.toMatchObject({admin:true});expect(verify).toHaveBeenCalledWith('test-token',true)})
})
