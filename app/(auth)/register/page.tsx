import { inviteRequired } from '@/lib/auth/invite'
import RegisterForm from './RegisterForm'

// Server component so the form knows whether SIGNUP_INVITE_CODE is set
// without exposing the code itself.
export const dynamic = 'force-dynamic'

export default function RegisterPage() {
  return <RegisterForm inviteRequired={inviteRequired()} />
}
