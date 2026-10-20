import type { GreenClaimResponse } from "../../../_api/greenClaim.types";

export const mockFullReport: GreenClaimResponse = {
  green_claim_report: [
    {
      statement: "Healthy and sustainable living",
      principles_violated: [
        {
          principle: "Clarity and Specificity",
          explanation:
            'Uses the unqualified term "sustainable" without specifying scope, metric, or which products or impacts are covered.',
          guidelines_reference: ["4. Scope"],
          improvement_recommendation:
            "Specify which products and which environmental impacts with measurable criteria.",
          confidence: "strong",
        },
        {
          principle: "Scientific Evidence and Substantiation",
          explanation:
            "No in-text substantiation, data, test method, or certification identifier is provided to support the sustainability claim.",
          guidelines_reference: ["5. Reasonable basis"],
          improvement_recommendation:
            "Add quantified evidence or cite a named certification with identifier.",
          confidence: "strong",
        },
      ],
    },
    {
      statement:
        "To make healthy and sustainable living affordable, attractive and accessible for as many people as possible, we offer home furnishing products, services and solutions that support a healthy and sustainable life at home as well a food range that supports healthy and sustainable eating.",
      principles_violated: [
        {
          principle: "Clarity and Specificity",
          explanation:
            'Repeatedly uses "sustainable" without defining what sustainability means or which specific products, services, or impacts are included.',
          guidelines_reference: ["4. Scope"],
          improvement_recommendation:
            "Define sustainability attributes and identify covered product lines and impacts.",
          confidence: "strong",
        },
        {
          principle: "Scientific Evidence and Substantiation",
          explanation:
            "No in-text metrics, methodologies, or certification identifiers substantiate that the offerings are sustainable.",
          guidelines_reference: ["5. Reasonable basis"],
          improvement_recommendation:
            "Provide quantified performance data or certification details for the claims.",
          confidence: "strong",
        },
      ],
    },
    {
      statement:
        "We're also working to contribute to a shift in society where healthy and sustainable lifestyles become the default.",
      principles_violated: [
        {
          principle: "Clarity and Specificity",
          explanation:
            'Uses the unqualified term "sustainable" without specifying what actions, scope, or environmental outcomes are meant.',
          guidelines_reference: ["4. Scope"],
          improvement_recommendation:
            "Specify concrete initiatives and the environmental outcomes targeted.",
          confidence: "strong",
        },
        {
          principle: "Scientific Evidence and Substantiation",
          explanation:
            "No in-text substantiation is provided for the implied environmental benefit of promoting sustainable lifestyles.",
          guidelines_reference: ["5. Reasonable basis"],
          improvement_recommendation:
            "Include measurable results or referenced evidence supporting the stated impact.",
          confidence: "strong",
        },
      ],
    },
  ],
  legal_statement:
    "From Legal: If you have scientific evidence supporting your sustainability claim but need further guidance on how to phrase it appropriately, please contact Legal for support.",
  guidelines:
    "https://iccwbo.org/wp-content/uploads/sites/3/2023/04/2023-ICC-Responsible-Environmental-Marketing-Communications-Checklist.pdf",
  problematic_words: {
    exact_matches: [
      {
        text: "sustainable",
        matched_against: "sustainable",
        confidence: 1,
        type: "exact",
        start: 12,
        end: 23,
      },
      {
        text: "sustainable",
        matched_against: "sustainable",
        confidence: 1,
        type: "exact",
        start: 51,
        end: 62,
      },
      {
        text: "sustainable",
        matched_against: "sustainable",
        confidence: 1,
        type: "exact",
        start: 225,
        end: 236,
      },
      {
        text: "sustainable",
        matched_against: "sustainable",
        confidence: 1,
        type: "exact",
        start: 297,
        end: 308,
      },
      {
        text: "sustainable",
        matched_against: "sustainable",
        confidence: 1,
        type: "exact",
        start: 392,
        end: 403,
      },
    ],
    close_matches: [],
  },
  formatted_report:
    '# Green Claim Analysis Report\n\n## Executive Summary\n\n| Metric | Value |\n|-------|-------|\n| Total Green Claims Identified | 3 |\n| Total Principle Violations | 6 |\n| Problematic Words Detected | 5 |\n## Detailed Analysis\n\n### Claim 1\n\n**Statement:**\n\n> Healthy and sustainable living\n\n**Status:** ❌ Non-compliant\n\n**Violations Found:** 2\n\n- **Principle:** Clarity and Specificity\n  - **Confidence:** STRONG\n  - **Explanation:** Uses the unqualified term "sustainable" without specifying scope, metric, or which products or impacts are covered.\n  - **Guidelines:** 4. Scope\n  - **Recommendation:** Specify which products and which environmental impacts with measurable criteria.\n\n- **Principle:** Scientific Evidence and Substantiation\n  - **Confidence:** STRONG\n  - **Explanation:** No in-text substantiation, data, test method, or certification identifier is provided to support the sustainability claim.\n  - **Guidelines:** 5. Reasonable basis\n  - **Recommendation:** Add quantified evidence or cite a named certification with identifier.\n\n### Claim 2\n\n**Statement:**\n\n> To make healthy and sustainable living affordable, attractive and accessible for as many people as possible, we offer home furnishing products, services and solutions that support a healthy and sustainable life at home as well a food range that supports healthy and sustainable eating.\n\n**Status:** ❌ Non-compliant\n\n**Violations Found:** 2\n\n- **Principle:** Clarity and Specificity\n  - **Confidence:** STRONG\n  - **Explanation:** Repeatedly uses "sustainable" without defining what sustainability means or which specific products, services, or impacts are included.\n  - **Guidelines:** 4. Scope\n  - **Recommendation:** Define sustainability attributes and identify covered product lines and impacts.\n\n- **Principle:** Scientific Evidence and Substantiation\n  - **Confidence:** STRONG\n  - **Explanation:** No in-text metrics, methodologies, or certification identifiers substantiate that the offerings are sustainable.\n  - **Guidelines:** 5. Reasonable basis\n  - **Recommendation:** Provide quantified performance data or certification details for the claims.\n\n### Claim 3\n\n**Statement:**\n\n> We\'re also working to contribute to a shift in society where healthy and sustainable lifestyles become the default.\n\n**Status:** ❌ Non-compliant\n\n**Violations Found:** 2\n\n- **Principle:** Clarity and Specificity\n  - **Confidence:** STRONG\n  - **Explanation:** Uses the unqualified term "sustainable" without specifying what actions, scope, or environmental outcomes are meant.\n  - **Guidelines:** 4. Scope\n  - **Recommendation:** Specify concrete initiatives and the environmental outcomes targeted.\n\n- **Principle:** Scientific Evidence and Substantiation\n  - **Confidence:** STRONG\n  - **Explanation:** No in-text substantiation is provided for the implied environmental benefit of promoting sustainable lifestyles.\n  - **Guidelines:** 5. Reasonable basis\n  - **Recommendation:** Include measurable results or referenced evidence supporting the stated impact.\n\n## Problematic Words Detected\n\n**Total Instances:** 5\n\n### Exact Matches (5)\n\n- **"sustainable"** \n- **"sustainable"** \n- **"sustainable"** \n- **"sustainable"** \n- **"sustainable"** \n\n## Legal Statement\n\nFrom Legal: If you have scientific evidence supporting your sustainability claim but need further guidance on how to phrase it appropriately, please contact Legal for support.\n\n## Guidelines Reference\n\nFor more information, consult:\n\n- https://iccwbo.org/wp-content/uploads/sites/3/2023/04/2023-ICC-Responsible-Environmental-Marketing-Communications-Checklist.pdf\n',
};

export const mockMinimalReport: GreenClaimResponse = {
  green_claim_report: [
    {
      statement: "100% eco-friendly product",
      principles_violated: [
        {
          principle: "Clarity and Specificity",
          explanation:
            'The term "eco-friendly" is too vague without specifying environmental benefits.',
          guidelines_reference: ["4. Scope"],
          improvement_recommendation:
            "Specify which environmental aspects and provide evidence.",
          confidence: "strong",
        },
      ],
    },
  ],
  legal_statement:
    "From Legal: If you have scientific evidence supporting your sustainability claim but need further guidance on how to phrase it appropriately, please contact Legal for support.",
  guidelines:
    "https://iccwbo.org/wp-content/uploads/sites/3/2023/04/2023-ICC-Responsible-Environmental-Marketing-Communications-Checklist.pdf",
  problematic_words: {
    exact_matches: [
      {
        text: "eco-friendly",
        matched_against: "eco-friendly",
        confidence: 1,
        type: "exact",
        start: 5,
        end: 17,
      },
    ],
    close_matches: [],
  },
  formatted_report: "# Green Claim Report\n\n## Minimal report...",
};

export const mockNoViolations: GreenClaimResponse = {
  green_claim_report: [],
  legal_statement:
    "From Legal: If you have scientific evidence supporting your sustainability claim but need further guidance on how to phrase it appropriately, please contact Legal for support.",
  guidelines:
    "https://iccwbo.org/wp-content/uploads/sites/3/2023/04/2023-ICC-Responsible-Environmental-Marketing-Communications-Checklist.pdf",
  problematic_words: {
    exact_matches: [
      {
        text: "sustainable",
        matched_against: "sustainable",
        confidence: 1,
        type: "exact",
        start: 10,
        end: 21,
      },
    ],
    close_matches: [],
  },
  formatted_report: "# Green Claim Report\n\nNo violations detected.",
};

export const mockNoProblematicWords: GreenClaimResponse = {
  green_claim_report: [
    {
      statement: "Our product reduces energy consumption by 30%",
      principles_violated: [
        {
          principle: "Scientific Evidence and Substantiation",
          explanation:
            "No test method or certification provided for the 30% claim.",
          guidelines_reference: ["5. Reasonable basis"],
          improvement_recommendation:
            "Include test method and independent verification.",
          confidence: "strong",
        },
      ],
    },
  ],
  legal_statement:
    "From Legal: If you have scientific evidence supporting your sustainability claim but need further guidance on how to phrase it appropriately, please contact Legal for support.",
  guidelines:
    "https://iccwbo.org/wp-content/uploads/sites/3/2023/04/2023-ICC-Responsible-Environmental-Marketing-Communications-Checklist.pdf",
  problematic_words: {
    exact_matches: [],
    close_matches: [],
  },
  formatted_report: "# Green Claim Report\n\nNo problematic words detected.",
};

export const mockMultipleStatements: GreenClaimResponse = {
  green_claim_report: [
    {
      statement: "Healthy and sustainable living",
      principles_violated: [
        {
          principle: "Clarity and Specificity",
          explanation:
            'Uses the unqualified term "sustainable" without specifying scope, metric, or which products or impacts are covered.',
          guidelines_reference: ["4. Scope"],
          improvement_recommendation:
            "Specify which products and which environmental impacts with measurable criteria.",
          confidence: "strong",
        },
        {
          principle: "Scientific Evidence and Substantiation",
          explanation:
            "No in-text substantiation, data, test method, or certification identifier is provided to support the sustainability claim.",
          guidelines_reference: ["5. Reasonable basis"],
          improvement_recommendation:
            "Add quantified evidence or cite a named certification with identifier.",
          confidence: "strong",
        },
      ],
    },
    {
      statement:
        "To make healthy and sustainable living affordable, attractive and accessible for as many people as possible, we offer home furnishing products, services and solutions that support a healthy and sustainable life at home as well a food range that supports healthy and sustainable eating.",
      principles_violated: [
        {
          principle: "Clarity and Specificity",
          explanation:
            'Repeatedly uses "sustainable" without defining what sustainability means or which specific products, services, or impacts are included.',
          guidelines_reference: ["4. Scope"],
          improvement_recommendation:
            "Define sustainability attributes and identify covered product lines and impacts.",
          confidence: "strong",
        },
        {
          principle: "Scientific Evidence and Substantiation",
          explanation:
            "No in-text metrics, methodologies, or certification identifiers substantiate that the offerings are sustainable.",
          guidelines_reference: ["5. Reasonable basis"],
          improvement_recommendation:
            "Provide quantified performance data or certification details for the claims.",
          confidence: "strong",
        },
      ],
    },
    {
      statement:
        "We're also working to contribute to a shift in society where healthy and sustainable lifestyles become the default.",
      principles_violated: [
        {
          principle: "Clarity and Specificity",
          explanation:
            'Uses the unqualified term "sustainable" without specifying what actions, scope, or environmental outcomes are meant.',
          guidelines_reference: ["4. Scope"],
          improvement_recommendation:
            "Specify concrete initiatives and the environmental outcomes targeted.",
          confidence: "strong",
        },
        {
          principle: "Scientific Evidence and Substantiation",
          explanation:
            "No in-text substantiation is provided for the implied environmental benefit of promoting sustainable lifestyles.",
          guidelines_reference: ["5. Reasonable basis"],
          improvement_recommendation:
            "Include measurable results or referenced evidence supporting the stated impact.",
          confidence: "strong",
        },
      ],
    },
    {
      statement: "100% eco-friendly product",
      principles_violated: [
        {
          principle: "Clarity and Specificity",
          explanation:
            'The term "eco-friendly" is too vague without specifying environmental benefits.',
          guidelines_reference: ["4. Scope"],
          improvement_recommendation:
            "Specify which environmental aspects and provide evidence.",
          confidence: "strong",
        },
      ],
    },
    {
      statement: "Our product reduces energy consumption by 30%",
      principles_violated: [
        {
          principle: "Scientific Evidence and Substantiation",
          explanation:
            "No test method or certification provided for the 30% claim.",
          guidelines_reference: ["5. Reasonable basis"],
          improvement_recommendation:
            "Include test method and independent verification.",
          confidence: "strong",
        },
      ],
    },
  ],
  legal_statement:
    "From Legal: If you have scientific evidence supporting your sustainability claim but need further guidance on how to phrase it appropriately, please contact Legal for support.",
  guidelines:
    "https://iccwbo.org/wp-content/uploads/sites/3/2023/04/2023-ICC-Responsible-Environmental-Marketing-Communications-Checklist.pdf",
  problematic_words: {
    exact_matches: [
      {
        text: "sustainable",
        matched_against: "sustainable",
        confidence: 1,
        type: "exact",
        start: 12,
        end: 23,
      },
      {
        text: "sustainable",
        matched_against: "sustainable",
        confidence: 1,
        type: "exact",
        start: 51,
        end: 62,
      },
      {
        text: "sustainable",
        matched_against: "sustainable",
        confidence: 1,
        type: "exact",
        start: 225,
        end: 236,
      },
      {
        text: "sustainable",
        matched_against: "sustainable",
        confidence: 1,
        type: "exact",
        start: 297,
        end: 308,
      },
      {
        text: "sustainable",
        matched_against: "sustainable",
        confidence: 1,
        type: "exact",
        start: 392,
        end: 403,
      },
    ],
    close_matches: [],
  },
  formatted_report: "# Green Claim Report\n\nMultiple statements report...",
};
