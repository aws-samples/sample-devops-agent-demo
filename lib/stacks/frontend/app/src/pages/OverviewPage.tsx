import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card'
import { Button } from '@/ui/button'
import { X } from 'lucide-react'

export interface OverviewPageProps {
  title?: string
  description?: string
  onClose?: () => void
}

export function OverviewPage({
  title = 'Architecture',
  description = 'AWS DevOps Agent integrates with your observability tools, CI/CD pipelines, and communication channels to provide autonomous incident response.',
  onClose,
}: OverviewPageProps) {
  const navigate = useNavigate()
  const handleClose = onClose ?? (() => navigate(-1))

  return (
    <div className="fixed inset-x-0 top-[65px] bottom-0 z-40 flex items-stretch justify-center bg-black/30 backdrop-blur-sm p-4">
      <Card className="w-full max-w-[96%] border bg-background shadow-xl flex flex-col">
        <CardHeader className="pb-2 shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle>{title}</CardTitle>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 flex gap-4">
          {/* Architecture diagram — takes ~70% */}
          <div className="flex-[7] flex items-center justify-center overflow-auto min-w-0">
            <img
              src="/DevopsAgentDiagram.png"
              alt="AWS DevOps Agent Architecture"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
          {/* Workflow steps — takes ~30% */}
          <div className="flex-[3] shrink-0 min-w-[260px] max-w-[320px] border-l pl-5 py-3 overflow-auto">
            <h3 className="text-sm font-semibold mb-1.5">Architecture Workflow</h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">{description}</p>
            <ol className="space-y-2.5">
              {[
                { n: 1, text: 'User accesses app via CloudFront, protected by AWS WAF' },
                { n: 2, text: 'CloudFront serves the React frontend from S3 origin' },
                { n: 3, text: 'Cognito authenticates the user and issues a JWT token' },
                { n: 4, text: 'API Gateway validates the JWT and routes REST requests' },
                { n: 5, text: 'Proxy Lambda handles API logic and invokes backend services' },
                { n: 6, text: 'RDS Proxy manages connections to PostgreSQL inside the VPC' },
                { n: 7, text: 'Admin triggers failure scenarios (SQS backlog, Lambda deploy, RDS index)' },
                { n: 8, text: 'AppSync streams real-time failure events to the frontend via WebSocket' },
                { n: 9, text: 'Lambda signs an HMAC webhook using Secrets Manager' },
                { n: 10, text: 'DevOps Agent receives the webhook, investigates, performs RCA, and generates a mitigation plan' },
                { n: 11, text: 'Failure logs stream through CloudWatch → Firehose → S3 for analysis' },
              ].map(({ n, text }) => (
                <li key={n} className="flex gap-2.5 items-start">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-foreground text-background flex items-center justify-center text-[9px] font-bold mt-0.5">
                    {n}
                  </span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
