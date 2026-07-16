import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

/** Shared placeholder shell for feature pages before business logic ships. */
export default function ComingSoon({ title, description }) {
  return (
    <div className="max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground rounded-md border border-dashed px-4 py-8 text-center">
            Coming Soon — architecture scaffold only. No business logic yet.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
