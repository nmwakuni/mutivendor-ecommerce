import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center space-y-6 max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold tracking-tight">
            Welcome to East Africa's Premier{' '}
            <span className="text-primary">Marketplace</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            Discover amazing products from trusted vendors. Pay securely with M-Pesa.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg">Start Shopping</Button>
            <Button size="lg" variant="outline">
              Become a Vendor
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Why Choose Us</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>M-Pesa Integration</CardTitle>
              <CardDescription>
                Pay securely with M-Pesa - Kenya's most trusted payment method
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Seamless checkout experience with instant payment confirmation
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Real-time Tracking</CardTitle>
              <CardDescription>Track your orders every step of the way</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Live delivery updates with precise location tracking
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Trusted Vendors</CardTitle>
              <CardDescription>Shop from verified, quality vendors</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                All vendors are carefully vetted and rated by customers
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
