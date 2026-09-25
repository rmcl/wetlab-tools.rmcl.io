import { Badge, Button, Card, CardFooter, CardHeader, Text } from '@fluentui/react-components'
import { ArrowRight20Regular, LockClosed16Regular } from '@fluentui/react-icons'
import { Link } from 'react-router-dom'
import { tools } from '../app/toolRegistry'

export function ToolIndexPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
      <section className="max-w-3xl">
        <Badge appearance="tint" color="success" icon={<LockClosed16Regular />}>Local-first</Badge>
        <h1 className="mt-5 text-4xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-5xl">Small tools for careful science.</h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">Focused analysis utilities that run directly in your browser. Pick a tool to get started.</p>
      </section>
      <section aria-labelledby="available-tools" className="mt-12">
        <div className="mb-5 flex items-center justify-between">
          <h2 id="available-tools" className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Available tools</h2>
          <Text size={200}>{tools.length} tool</Text>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => {
            const Icon = tool.icon
            return (
              <Card key={tool.route} appearance="filled-alternative" className="!rounded-2xl !border !border-emerald-950/10 !bg-white !p-2 shadow-[0_12px_35px_rgba(20,60,48,0.06)]">
                <CardHeader
                  image={<div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-800"><Icon /></div>}
                  header={<Text weight="semibold" size={500}>{tool.name}</Text>}
                  description={<Text size={200} className="text-slate-500">{tool.category}</Text>}
                />
                <p className="px-3 py-3 text-sm leading-6 text-slate-600">{tool.description}</p>
                <CardFooter className="!justify-between !px-3 !pb-3">
                  <Badge appearance="outline" color="success">{tool.status}</Badge>
                  <Link to={tool.route}><Button appearance="primary" icon={<ArrowRight20Regular />} iconPosition="after">Open tool</Button></Link>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      </section>
    </div>
  )
}
