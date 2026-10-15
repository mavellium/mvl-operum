import { redirect } from 'next/navigation'

/** Cadastros Globais sem seção no endereço abre Departamentos. */
export default function AdminCadastrosIndexPage() {
  redirect('/admin/cadastros/departamentos')
}
