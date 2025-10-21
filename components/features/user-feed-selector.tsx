"use client";

import type { Bundle, Podcast, UserCurationProfile } from "@prisma/client";

// Type for bundle with podcasts array from API
type BundleWithPodcasts = (Bundle & { podcasts: Podcast[] }) & {
  canInteract?: boolean;
  lockReason?: string | null;
};

import { CheckCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppSpinner } from "@/components/ui/app-spinner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUserCurationProfileStore } from "@/lib/stores";
import { CuratedPodcastList } from "../data-components/selectable-podcast-list";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Typography } from "../ui/typography";

function UserFeedSelectorWizard() {
  const [step, setStep] = useState(1);
  const [userCurationProfileName, setUserCurationProfileName] = useState("");
  const [isBundleSelection, setIsBundleSelection] = useState(false);
  const [selectedBundleId, setSelectedBundleId] = useState<string | undefined>(
    undefined,
  );
  const [selectedPodcasts, setSelectedPodcasts] = useState<Podcast[]>([]);
  const [existingProfile, setExistingProfile] =
    useState<UserCurationProfile | null>(null);
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);
  const [bundles, setBundles] = useState<BundleWithPodcasts[]>([]);
  const [isLoadingBundles, setIsLoadingBundles] = useState(false);

  const { createUserCurationProfile, isLoading, error } =
    useUserCurationProfileStore();
  const canCreateUserCurationProfile = () => true;
  const isTrialing = false;
  const getRemainingTrialDays = () => 0;

  // Check if user already has an active profile
  useEffect(() => {
    const checkExistingProfile = async () => {
      try {
        const response = await fetch("/api/user-curation-profiles");
        if (response.ok) {
          const profile = await response.json();
          setExistingProfile(profile);
        }
      } catch {
        // Silently handle profile check errors
      } finally {
        setIsCheckingProfile(false);
      }
    };

    checkExistingProfile();
  }, []);

  // Fetch bundles when bundle selection is needed
  const fetchBundles = async () => {
    if (bundles.length > 0) return; // Already loaded

    setIsLoadingBundles(true);
    try {
      const response = await fetch("/api/curated-bundles");
      if (response.ok) {
        const data = await response.json();
        setBundles(data);
      }
    } catch (error) {
      console.error("Error fetching bundles:", error);
      toast.error("Failed to load bundles. Please try again.");
    } finally {
      setIsLoadingBundles(false);
    }
  };

  const handleCreateUserCurationProfile = async () => {
    if (!canCreateUserCurationProfile()) {
      const message = isTrialing
        ? `You can only create one Personalized Feed during your trial period. Remaining trial days: ${getRemainingTrialDays()}.`
        : "You need an active subscription to create a Personalized Feed.";
      toast.error(message);
      return;
    }

    let data: {
      name: string;
      isBundleSelection: boolean;
      selectedBundleId?: string;
      selectedPodcasts?: string[];
    };

    if (isBundleSelection) {
      if (!selectedBundleId) {
        toast.error("Please select a bundle.");
        return;
      }
      data = {
        name: userCurationProfileName,
        isBundleSelection: true,
        selectedBundleId: selectedBundleId,
      };
    } else {
      if (selectedPodcasts.length === 0) {
        toast.error(
          "Please select at least one podcast for your custom Personalized Feed.",
        );
        return;
      }
      data = {
        name: userCurationProfileName,
        isBundleSelection: false,
        selectedPodcasts: selectedPodcasts.map((p) => p.podcast_id),
      };
    }

    await createUserCurationProfile(data);
    if (!error) {
      toast.success("Personalized Feed created successfully!");
      setStep(1);
      setUserCurationProfileName("");
      setIsBundleSelection(false);
      setSelectedBundleId(undefined);
      setSelectedPodcasts([]);
    }
  };

  // Show loading state while checking for existing profile
  if (isCheckingProfile) {
    return (
      <div className="max-w-[300px] md:max-w-[1200px] mx-auto p-8 md:p-4">
        <div className="text-center py-6">
          <AppSpinner size="lg" label="Checking your profile status..." />
        </div>
      </div>
    );
  }

  // Show message if user already has an active profile
  if (existingProfile) {
    return (
      <div className="max-w-[300px] md:max-w-[1200px] mx-auto p-8 md:p-4">
        <Card className="w-full mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">
              You Already Have a Profile
            </CardTitle>
            <CardDescription className="text-lg">
              You already have an active Personalized Feed:{" "}
              <strong>{existingProfile.name}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <Typography
              variant="body"
              className="text-muted-foreground max-w-md mx-auto"
            >
              You can only have one active Personalized Feed at a time. You can
              edit your existing profile or deactivate it to create a new one.
            </Typography>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/dashboard">
                <Button variant="default" className="w-full sm:w-auto">
                  Manage Profile
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0 justify-center items-center w-full px-0 my-0">
      {/* Step 1: Choose User Curation Profile Type */}
      {step === 1 && (
        <div className="w-full">
          <div className="w-full">
            <CardHeader>
              <CardDescription>
                <Typography
                  className="text-primary-forefround w-full p-0 text-base"
                  variant="body"
                  as="span"
                >
                  Choose from expertly curated bundles tailored to your
                  subscription plan.
                </Typography>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button
                onClick={() => {
                  setIsBundleSelection(true);
                  setStep(2);
                  // Fetch bundles when user selects bundle option
                  fetchBundles();
                }}
                variant="default"
                size="md"
                className="w-full md:max-w-[40%] min-h-12 h-auto mt-4"
              >
                Choose a bundle
              </Button>
              {/* <Button
								onClick={() => {
									setIsBundleSelection(false);
									setStep(2);
								}}
								variant="secondary"
								disabled
								className="w-full md:max-w-[50%] min-h-12 h-auto mt-4">
								Custom Bundles				</Button> */}
            </CardContent>
          </div>
        </div>
      )}

      {/* Step 2: Select Content */}
      {step === 2 && (
        <div className="w-full">
          <Typography variant="body" className="mb-2">
            {isBundleSelection
              ? "Select the bundle of pre-curated shows. Note: You only get to pick one at a time"
              : "Select the Podcasts shows for Your Custom Weekly Bundle Feed"}
          </Typography>
          {isBundleSelection ? (
            <div className="w-full max-w-md">
              {isLoadingBundles ? (
                <div className="text-center py-8">
                  <AppSpinner size="lg" label="Loading bundles..." />
                </div>
              ) : bundles.filter((b) => b.canInteract).length === 0 ? (
                <div className="text-center py-8">
                  <Typography
                    variant="h4"
                    className="mb-4 text-muted-foreground"
                  >
                    {bundles.length === 0
                      ? "No Bundles Available"
                      : "No Access to Bundles"}
                  </Typography>
                  <Typography
                    variant="body"
                    className="mb-4 text-muted-foreground"
                  >
                    {bundles.length === 0
                      ? "There are currently no PODSLICE bundles available. Please check back later or contact support if this issue persists."
                      : "You don't have access to any PODSLICE bundles with your current plan. Upgrade your plan to access more bundles."}
                  </Typography>
                  <Button
                    variant="outline"
                    onClick={fetchBundles}
                    className="mb-4"
                  >
                    Try Again
                  </Button>
                  <div className="text-sm text-muted-foreground">
                    <Typography variant="body">
                      Need more details about bundles?{" "}
                      <Link
                        href="/curated-bundles"
                        className="text-teal-500 hover:underline"
                      >
                        View bundle details here
                      </Link>
                    </Typography>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <Label
                      htmlFor="bundle-select"
                      className="block text-sm font-medium mb-2"
                    >
                      Choose from a list of available bundles
                    </Label>
                    <Select
                      value={selectedBundleId || ""}
                      onValueChange={(value) => {
                        setSelectedBundleId(value);
                      }}
                    >
                      <SelectTrigger id="bundle-select" className="w-full my-6">
                        <SelectValue placeholder="Select a bundle..." />
                      </SelectTrigger>
                      <SelectContent>
                        {bundles
                          .filter((b) => b.canInteract)
                          .map((bundle) => (
                            <SelectItem
                              key={bundle.bundle_id}
                              value={bundle.bundle_id}
                            >
                              {bundle.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <Typography
                      variant="body"
                      className="mb-2 text-foreground/90"
                    >
                      Need more details about the bundles?{" "}
                      <Link
                        href="/curated-bundles"
                        className="text-teal-500 hover:underline font-medium"
                      >
                        View bundle details here
                      </Link>
                    </Typography>
                  </div>
                </>
              )}
            </div>
          ) : (
            <CuratedPodcastList
              onSelectPodcast={(podcast) => {
                const isAlreadySelected = selectedPodcasts.some(
                  (p) => p.podcast_id === podcast.podcast_id,
                );
                if (isAlreadySelected) {
                  setSelectedPodcasts(
                    selectedPodcasts.filter(
                      (p) => p.podcast_id !== podcast.podcast_id,
                    ),
                  );
                } else {
                  if (selectedPodcasts.length < 5) {
                    setSelectedPodcasts([...selectedPodcasts, podcast]);
                  } else {
                    toast.info("You can select a maximum of 5 podcasts.");
                  }
                }
              }}
              selectedPodcasts={selectedPodcasts}
            />
          )}
          <div className="flex justify-between mt-8 flex-col md:flex-row">
            <Button
              variant="outline"
              className="p-4"
              size="md"
              onClick={() => setStep(1)}
            >
              Back
            </Button>
            <Button
              variant="default"
              onClick={() => setStep(3)}
              disabled={
                isBundleSelection
                  ? !selectedBundleId ||
                    bundles.filter((b) => b.canInteract).length === 0
                  : selectedPodcasts.length === 0
              }
            >
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Review and Create */}
      {step === 3 && (
        <div className="w-full">
          <Card className="w-full">
            <CardHeader>
              <CardDescription className="text-base">
                Review your Bundled Feed Details
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <div className="border-2 p-6 rounded-xl">
                <Label
                  htmlFor="userCurationProfileName"
                  className="block text-sm font-medium mb-2"
                >
                  Personalized Feed Name
                </Label>
                <Input
                  id="userCurationProfileName"
                  type="text"
                  value={userCurationProfileName}
                  onChange={(e) => setUserCurationProfileName(e.target.value)}
                  placeholder="Enter your profile name (e.g., My Daily Tech News)"
                />

                <div className="w-full max-w-[50%] p-3 rounded-lg border-2 bg-slate-900 border-teal-700 shadow-lg">
                  <Typography
                    variant="h4"
                    className="mb-1 text-foreground font-medium text-sm"
                  >
                    Selected Content:
                  </Typography>
                  {isBundleSelection && selectedBundleId ? (
                    <p className="text-teal-100 uppercase font-bold">
                      {bundles.find((b) => b.bundle_id === selectedBundleId)
                        ?.name || selectedBundleId}
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {selectedPodcasts.map((p) => (
                        <li key={p.podcast_id} className="text-sm">
                          {p.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div className="flex flex-row gap-2 mt-4">
                <Button
                  variant="outline"
                  className="p-4"
                  size="md"
                  onClick={() => setStep(2)}
                >
                  Back
                </Button>
                <Button
                  variant="default"
                  onClick={handleCreateUserCurationProfile}
                  disabled={isLoading || userCurationProfileName.trim() === ""}
                >
                  {isLoading ? (
                    <AppSpinner size="sm" label="Creating..." />
                  ) : (
                    "Create Personalized Feed"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default UserFeedSelectorWizard;
