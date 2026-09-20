import type { Provider, TagMap, TagValidationResult } from "./types";

/**
 * Tag key/value constraints mirror each provider's actual API limits, so
 * validation failures surface in the UI before a request round-trips and
 * fails server-side.
 *
 * AWS: https://docs.aws.amazon.com/general/latest/gr/aws_tagging.html
 * GCP labels: https://cloud.google.com/resource-manager/docs/tags/tags-creating-and-managing
 */
const AWS_KEY_MAX = 128;
const AWS_VALUE_MAX = 256;
const AWS_MAX_TAGS = 50;
const AWS_ALLOWED = /^[a-zA-Z0-9 +\-=._:/@]*$/;

const GCP_MAX = 63;
const GCP_KEY_RE = /^[a-z][a-z0-9_-]*$/;
const GCP_VALUE_RE = /^[a-z0-9_-]*$/;
const GCP_MAX_LABELS = 64;

/** Provider limit on tags/labels per resource. */
export function maxTagsPerResource(provider: Provider): number {
  return provider === "aws" ? AWS_MAX_TAGS : GCP_MAX_LABELS;
}

export function validateTagSet(provider: Provider, tags: TagMap): TagValidationResult {
  const errors: TagValidationResult["errors"] = [];
  const keys = Object.keys(tags);

  if (provider === "aws") {
    if (keys.length > AWS_MAX_TAGS) {
      errors.push({ key: "*", message: `AWS allows at most ${AWS_MAX_TAGS} tags per resource.` });
    }
    for (const key of keys) {
      const value = tags[key];
      if (key.length === 0 || key.length > AWS_KEY_MAX) {
        errors.push({ key, message: `Key must be 1-${AWS_KEY_MAX} characters.` });
      }
      if (value.length > AWS_VALUE_MAX) {
        errors.push({ key, message: `Value must be at most ${AWS_VALUE_MAX} characters.` });
      }
      if (!AWS_ALLOWED.test(key) || !AWS_ALLOWED.test(value)) {
        errors.push({
          key,
          message: "Only letters, numbers, spaces, and + - = . _ : / @ are allowed.",
        });
      }
      if (key.toLowerCase().startsWith("aws:")) {
        errors.push({ key, message: "The \"aws:\" prefix is reserved by AWS." });
      }
    }
  } else {
    if (keys.length > GCP_MAX_LABELS) {
      errors.push({ key: "*", message: `GCP allows at most ${GCP_MAX_LABELS} labels per resource.` });
    }
    for (const key of keys) {
      const value = tags[key];
      if (key.length === 0 || key.length > GCP_MAX) {
        errors.push({ key, message: `Key must be 1-${GCP_MAX} characters.` });
      }
      if (value.length > GCP_MAX) {
        errors.push({ key, message: `Value must be at most ${GCP_MAX} characters.` });
      }
      if (!GCP_KEY_RE.test(key)) {
        errors.push({
          key,
          message: "Key must start with a lowercase letter and contain only lowercase letters, digits, _ or -.",
        });
      }
      if (!GCP_VALUE_RE.test(value)) {
        errors.push({
          key,
          message: "Value must contain only lowercase letters, digits, _ or -.",
        });
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateSingleTag(provider: Provider, key: string, value: string): TagValidationResult {
  return validateTagSet(provider, { [key]: value });
}

/** Provider-specific hint text shown under tag inputs in the UI. */
export function tagHint(provider: Provider): string {
  return provider === "aws"
    ? `Up to ${AWS_KEY_MAX} chars/key, ${AWS_VALUE_MAX} chars/value, max ${AWS_MAX_TAGS} tags. Letters, numbers, spaces, + - = . _ : / @.`
    : `Lowercase only, up to ${GCP_MAX} chars/key/value, max ${GCP_MAX_LABELS} labels. Letters, numbers, _ and - only; key must start with a letter.`;
}
