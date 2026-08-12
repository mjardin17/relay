import crypto from 'node:crypto';

export type ClassificationType = 'PRIVATE_ADDRESS' | 'EMAIL' | 'SENSITIVE_KEY' | 'SENSITIVE_DATA';

export interface ForbiddenPattern {
  name: string;
  valueOrRegex: string | RegExp;
  classification: ClassificationType;
}

export interface PrivacyViolation {
  targetName: string;
  lineNumber?: number;
  fieldPath?: string;
  classification: ClassificationType;
  fingerprint: string;
}

/**
 * Derives a safe hash fingerprint without revealing the actual secret.
 */
export function getSafeFingerprint(secret: string): string {
  const hash = crypto.createHash('sha256').update(secret).digest('hex').substring(0, 10);
  return `sha256:${hash}...`;
}

/**
 * Scans text lines and structured objects for forbidden sensitive values.
 */
export class PrivacyGateScanner {
  private forbiddenPatterns: ForbiddenPattern[];

  constructor(forbiddenPatterns: ForbiddenPattern[]) {
    this.forbiddenPatterns = forbiddenPatterns;
  }

  /**
   * Scans raw text content (such as stdout, stderr, markdown report, log file).
   */
  public scanTextContent(targetName: string, content: string): PrivacyViolation[] {
    const violations: PrivacyViolation[] = [];
    if (!content) return violations;

    const lines = content.split('\n');
    lines.forEach((lineText, index) => {
      for (const pattern of this.forbiddenPatterns) {
        let matchedString: string | null = null;

        if (typeof pattern.valueOrRegex === 'string') {
          if (lineText.includes(pattern.valueOrRegex)) {
            matchedString = pattern.valueOrRegex;
          }
        } else if (pattern.valueOrRegex instanceof RegExp) {
          const match = lineText.match(pattern.valueOrRegex);
          if (match) {
            matchedString = match[0];
          }
        }

        if (matchedString) {
          violations.push({
            targetName,
            lineNumber: index + 1,
            classification: pattern.classification,
            fingerprint: getSafeFingerprint(matchedString),
          });
        }
      }
    });

    return violations;
  }

  /**
   * Scans a JavaScript object (nested JSON, arrays, Error instances, serialized strings).
   */
  public scanObject(
    targetName: string,
    obj: any,
    currentPath = 'root',
    visited = new WeakSet()
  ): PrivacyViolation[] {
    const violations: PrivacyViolation[] = [];
    if (obj === null || obj === undefined) return violations;

    // Primitives
    if (typeof obj !== 'object') {
      const strVal = String(obj);
      for (const pattern of this.forbiddenPatterns) {
        let matchedString: string | null = null;
        if (typeof pattern.valueOrRegex === 'string') {
          if (strVal.includes(pattern.valueOrRegex)) {
            matchedString = pattern.valueOrRegex;
          }
        } else if (pattern.valueOrRegex instanceof RegExp) {
          const match = strVal.match(pattern.valueOrRegex);
          if (match) matchedString = match[0];
        }

        if (matchedString) {
          violations.push({
            targetName,
            fieldPath: currentPath,
            classification: pattern.classification,
            fingerprint: getSafeFingerprint(matchedString),
          });
        }
      }

      // Check if string is serialized JSON
      if (typeof obj === 'string' && ((obj.startsWith('{') && obj.endsWith('}')) || (obj.startsWith('[') && obj.endsWith(']')))) {
        try {
          const parsed = JSON.parse(obj);
          const nestedViolations = this.scanObject(targetName, parsed, `${currentPath} (JSON)`, visited);
          violations.push(...nestedViolations);
        } catch {
          // Not valid JSON, ignored
        }
      }

      return violations;
    }

    if (visited.has(obj)) return violations;
    visited.add(obj);

    // Error instances
    if (obj instanceof Error) {
      const errObj = {
        name: obj.name,
        message: obj.message,
        stack: obj.stack,
      };
      return this.scanObject(targetName, errObj, `${currentPath}.[Error]`, visited);
    }

    // Arrays
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        const itemViolations = this.scanObject(targetName, item, `${currentPath}[${index}]`, visited);
        violations.push(...itemViolations);
      });
      return violations;
    }

    // Standard objects
    for (const [key, value] of Object.entries(obj)) {
      const keyPath = `${currentPath}.${key}`;
      const fieldViolations = this.scanObject(targetName, value, keyPath, visited);
      violations.push(...fieldViolations);
    }

    return violations;
  }

  /**
   * Formats violations into a safe report string without echoing any secrets.
   */
  public formatViolationsReport(violations: PrivacyViolation[]): string {
    if (violations.length === 0) {
      return 'PRIVACY_GATE_PASS: Zero sensitive violations detected.';
    }

    const lines: string[] = [
      '================================================================',
      '  PRIVACY GATE AUDIT FAILURE: SENSITIVE DATA EXPOSURE DETECTED',
      '================================================================',
      `Total Violations Found: ${violations.length}`,
      '',
    ];

    violations.forEach((v, idx) => {
      const location = v.lineNumber
        ? `Line ${v.lineNumber}`
        : `Path: ${v.fieldPath || 'unknown'}`;
      lines.push(
        `[Violation #${idx + 1}] Target: ${v.targetName} | Location: ${location} | Classification: ${v.classification} | Fingerprint: ${v.fingerprint}`
      );
    });

    lines.push('');
    lines.push('SECURITY POLICY NOTICE: Raw secrets have been masked in this report to prevent credential leaks.');
    return lines.join('\n');
  }
}
