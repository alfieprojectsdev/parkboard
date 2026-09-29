import { redirect } from 'next/navigation'

// v2 has one page per task; /LMR is kept only so old links still work.
export default function LMRHome() {
  redirect('/LMR/slots')
}
