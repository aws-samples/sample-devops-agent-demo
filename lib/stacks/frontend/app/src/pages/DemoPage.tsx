import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card'
import { Header } from '@/ui/header'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/ui/tabs'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/ui/accordion'
import { Badge } from '@/ui/badge'
import { ScrollArea } from '@/ui/scroll-area'
import { RotateCcw, Network, ArrowRight } from 'lucide-react'
import { demoConfig } from '@/demo.config'
import { useDarkMode } from '@/lib/use-dark-mode'

export interface DemoPageProps {
  title?: string
  logoUrl?: string
  logoUrlDark?: string
  /** Content for the left data panel */
  leftPanel?: React.ReactNode
  /** Content for the right top panel (diagram/visualization) */
  rightTopPanel?: React.ReactNode
  /** Content for the right bottom panel (output/chat) */
  rightBottomPanel?: React.ReactNode
  /** Tab labels for the right panel */
  tabs?: string[]
  /** Tab content (keyed by tab label) */
  tabContent?: Record<string, React.ReactNode>
  /** Left panel accordion sections */
  sections?: { title: string; content: React.ReactNode }[]
  /** Data fields for the left panel header card */
  dataFields?: { label: string; value: string }[]
  /** Title for the left panel data card */
  dataTitle?: string
  onArchitectureClick?: () => void
  onRestart?: () => void
  onComplete?: () => void
}

export function DemoPage({
  title = demoConfig.title,
  logoUrl = demoConfig.logo || undefined,
  logoUrlDark = demoConfig.logoDark || undefined,
  leftPanel,
  rightTopPanel,
  rightBottomPanel,
  tabs = ['Workflow', 'Traces', 'Output'],
  tabContent,
  sections = [
    { title: 'Section 1', content: <div className="h-8 rounded bg-primary/5" /> },
    { title: 'Section 2', content: <div className="h-8 rounded bg-primary/5" /> },
    { title: 'Section 3', content: <div className="h-8 rounded bg-primary/5" /> },
  ],
  dataFields = [
    { label: 'Field 1', value: 'Value 1' },
    { label: 'Field 2', value: 'Value 2' },
    { label: 'Field 3', value: 'Value 3' },
    { label: 'Field 4', value: 'Value 4' },
  ],
  dataTitle = 'Sample Data',
  onArchitectureClick,
  onRestart,
  onComplete,
}: DemoPageProps) {
  const navigate = useNavigate()
  const { isDark, toggle: toggleDarkMode } = useDarkMode()
  const [activeTab, setActiveTab] = useState(tabs[0])

  const handleArchitecture = onArchitectureClick ?? (() => navigate('/overview'))
  const handleRestart = onRestart ?? (() => navigate('/'))
  const handleComplete = onComplete ?? (() => navigate('/conclusion'))

  const logoElement = logoUrl ? (
    <div className="flex items-center">
      <img src={logoUrl} alt="Logo" className="h-6 dark:hidden" />
      <img src={logoUrlDark || logoUrl} alt="Logo" className="h-6 hidden dark:block" />
    </div>
  ) : undefined

  return (
    <div className="h-screen flex flex-col text-foreground">
      {/* Header */}
      <Header
        title={title}
        description={demoConfig.description}
        logo={logoElement}
        isDark={isDark}
        onDarkModeToggle={toggleDarkMode}
        showDarkModeToggle
        actions={
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={handleArchitecture} title="Architecture">
              <Network className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      {/* Split Panel Body */}
      <div className="flex-1 flex min-h-0 p-4 gap-4">
        {/* Left Panel — Data */}
        <div className="w-1/2 flex flex-col min-h-0">
          <ScrollArea className="flex-1">
            {leftPanel ?? (
              <div className="space-y-3 pr-2">
                {/* Data Card */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">Sample data</Badge>
                      <CardTitle className="text-base">{dataTitle}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                      {dataFields.map((field, i) => (
                        <div key={i}>
                          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{field.label}</p>
                          <p className="text-sm font-medium">{field.value}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Accordion Sections */}
                <Card>
                  <CardContent className="p-0">
                    <Accordion type="multiple" className="px-4">
                      {sections.map((section, i) => (
                        <AccordionItem key={i} value={`section-${i}`}>
                          <AccordionTrigger className="text-sm font-medium">
                            {section.title}
                          </AccordionTrigger>
                          <AccordionContent>
                            {section.content}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right Panel — Visualization + Output */}
        <div className="w-1/2 flex flex-col min-h-0 gap-4">
          {/* Top: Tabs + Diagram/Workflow */}
          <Card className="flex-1 flex flex-col min-h-0">
            <CardContent className="flex-1 flex flex-col p-4 min-h-0">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-3">
                  <TabsList>
                    {tabs.map(tab => (
                      <TabsTrigger key={tab} value={tab} className="text-xs">
                        {tab}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  <Button variant="outline" size="sm" onClick={handleRestart}>
                    <RotateCcw className="h-3 w-3 mr-1" /> Restart
                  </Button>
                </div>

                {tabs.map(tab => (
                  <TabsContent key={tab} value={tab} className="flex-1 min-h-0">
                    <ScrollArea className="h-full">
                      {tabContent?.[tab] ?? rightTopPanel ?? (
                        <div className="h-full min-h-[200px] rounded-lg bg-primary/5 flex items-center justify-center text-muted-foreground text-sm">
                          {tab} content
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>

          {/* Bottom: Output/Chat area */}
          <Card className="h-[280px] flex flex-col min-h-0">
            <CardContent className="flex-1 p-4 min-h-0">
              <ScrollArea className="h-full">
                {rightBottomPanel ?? (
                  <div className="space-y-3">
                    <div className="h-12 rounded bg-primary/5" />
                    <div className="h-12 rounded bg-primary/5" />
                    <div className="h-12 rounded bg-primary/5" />
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer with Next button */}
      <div className="flex items-center justify-end px-4 py-2 border-t border-border">
        <Button size="sm" onClick={handleComplete}>
          Next <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}
