import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/Ml')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/Ml"!</div>
}
