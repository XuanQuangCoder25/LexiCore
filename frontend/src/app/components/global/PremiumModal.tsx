import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import {
  Crown,
  Check,
  Zap,
  Mic,
  Brain,
  BarChart3,
  Users,
  X,
  CreditCard,
} from "lucide-react";

interface PremiumModalProps {
  open: boolean;
  onClose: () => void;
}

const features = [
  { icon: Zap, label: "Ad-free learning experience" },
  { icon: Mic, label: "Advanced AI Voice Recognition" },
  { icon: Brain, label: "Unlimited AI-powered feedback" },
  { icon: BarChart3, label: "Detailed analytics & reports" },
  { icon: Users, label: "Priority community support" },
  { icon: Crown, label: "Exclusive Pro badges & frames" },
];

const plans = [
  {
    id: "monthly",
    label: "Monthly",
    price: "99,000₫",
    period: "/month",
    usd: "$3.99/mo",
    savings: null,
    badge: null,
  },
  {
    id: "yearly",
    label: "Yearly",
    price: "799,000₫",
    period: "/year",
    usd: "$31.99/yr",
    savings: "Save 33%",
    badge: "Most Popular",
  },
];

export function PremiumModal({ open, onClose }: PremiumModalProps) {
  const [selectedPlan, setSelectedPlan] = useState("yearly");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Crown className="h-5 w-5" /> Upgrade to Pro
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Features */}
          <div className="grid grid-cols-2 gap-2">
            {features.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-sm">
                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span>{label}</span>
              </div>
            ))}
          </div>

          <Separator />

          {/* Plans */}
          <div className="grid grid-cols-2 gap-3">
            {plans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`relative p-4 rounded-lg border-2 text-left transition-all ${
                  selectedPlan === plan.id ? "border-foreground" : "border-border hover:border-muted-foreground"
                }`}
              >
                {plan.badge && (
                  <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs whitespace-nowrap">
                    {plan.badge}
                  </Badge>
                )}
                <p className="font-semibold">{plan.label}</p>
                <p className="text-2xl font-bold mt-1">{plan.price}</p>
                <p className="text-xs text-muted-foreground">{plan.period}</p>
                {plan.savings && (
                  <p className="text-xs text-green-600 font-medium mt-1">{plan.savings}</p>
                )}
                {selectedPlan === plan.id && (
                  <div className="absolute top-3 right-3">
                    <Check className="h-4 w-4" />
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Payment Buttons */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground text-center">Select payment method</p>
            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" className="text-xs h-10">
                <CreditCard className="h-4 w-4 mr-1" /> Stripe
              </Button>
              <Button variant="outline" className="text-xs h-10">
                VNPay
              </Button>
              <Button variant="outline" className="text-xs h-10">
                MoMo
              </Button>
            </div>
            <Button className="w-full mt-1">
              <Crown className="h-4 w-4 mr-2" />
              Start Pro — {plans.find((p) => p.id === selectedPlan)?.price}{plans.find((p) => p.id === selectedPlan)?.period}
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Cancel anytime. No hidden fees. 7-day money-back guarantee.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
