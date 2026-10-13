// The onboarding repository the app uses — chosen once by STORAGE_MODE (lib/config.ts).
import { STORAGE_MODE } from "@/lib/config";
import { localOnboardingRepository, type OnboardingRepository } from "./repository";
import { serverOnboardingRepository } from "./server-repository";

export const onboardingRepository: OnboardingRepository = STORAGE_MODE === "server" ? serverOnboardingRepository : localOnboardingRepository;
