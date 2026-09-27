/**
 * PROJECTPULSE — Pure Vanilla JavaScript Enhancements (Step 15)
 * Meaningful DOM interactions implemented entirely in native JavaScript.
 * Features:
 *   1. Delete confirmation dialog enhancements (ESC key to cancel, backdrop click, focus management)
 *   2. Form validation live feedback (inline error badges, date sequence check, blur & input events)
 *   3. Live character count for description textareas with threshold warning indicators
 *   4. Enhanced search & filter interactions (keyboard '/' shortcut, ESC to clear, badge hints)
 */

(function () {
  'use strict';

  // Helper to safely select elements
  function $(selector, context) {
    return (context || document).querySelector(selector);
  }

  function $$(selector, context) {
    return Array.from((context || document).querySelectorAll(selector));
  }

  // ==========================================================================
  // 1. DELETE CONFIRMATION DIALOG INTERACTIONS
  // ==========================================================================
  function initDeleteDialogEnhancements() {
    // Global ESC key listener to cancel any open dialog safely
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        // Look for open modal cancel button
        const cancelBtn = $('button:not([disabled])', $('.fixed.inset-0'));
        if (cancelBtn) {
          // Find button with text Cancel
          const allButtons = $$('button', $('.fixed.inset-0'));
          const targetCancel = allButtons.find(function (btn) {
            return btn.textContent.trim().toLowerCase().includes('cancel');
          });
          if (targetCancel) {
            targetCancel.click();
          }
        }
      }
    });

    // Backdrop click listener to cancel modal if user clicks outside the modal dialog box
    document.addEventListener('click', function (e) {
      const backdrop = e.target;
      if (backdrop && backdrop.classList && backdrop.classList.contains('fixed') && backdrop.classList.contains('inset-0')) {
        // Find cancel button within the backdrop
        const allButtons = $$('button', backdrop);
        const cancelBtn = allButtons.find(function (btn) {
          return btn.textContent.trim().toLowerCase().includes('cancel');
        });
        if (cancelBtn) {
          cancelBtn.click();
        }
      }
    });

    // Auto-focus safety: When a delete modal appears, set focus on the "Cancel" button to prevent accidental Enter submit
    const observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach(function (node) {
            if (node.nodeType === 1 && (node.matches('.fixed.inset-0') || node.querySelector('.fixed.inset-0'))) {
              const modal = node.matches('.fixed.inset-0') ? node : node.querySelector('.fixed.inset-0');
              if (modal && modal.textContent.includes('Are you sure you want to delete')) {
                const buttons = $$('button', modal);
                const cancelBtn = buttons.find(function (b) {
                  return b.textContent.trim().toLowerCase() === 'cancel';
                });
                if (cancelBtn) {
                  cancelBtn.focus();
                }
              }
            }
          });
        }
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  // ==========================================================================
  // 2. LIVE FORM VALIDATION FEEDBACK
  // ==========================================================================
  function initFormValidationFeedback() {
    // Live validation on blur
    document.addEventListener(
      'blur',
      function (e) {
        const input = e.target;
        if (!input || !input.form) return;

        // Check if field is marked required in label or placeholder
        const label = input.closest('div') ? $('label', input.closest('div')) : null;
        const isRequired = (label && label.textContent.includes('*')) || input.hasAttribute('required');

        if (isRequired) {
          validateField(input);
        }
      },
      true
    );

    // Clear error as user types
    document.addEventListener(
      'input',
      function (e) {
        const input = e.target;
        if (!input || !input.form) return;

        // If field had validation feedback, re-validate smoothly
        const parent = input.closest('div');
        if (parent && $('.js-validation-msg', parent)) {
          validateField(input);
        }

        // Cross-field validation for Start Date & Deadline
        if (input.type === 'date') {
          validateDateSequence(input);
        }
      },
      true
    );

    function validateField(input) {
      const parent = input.closest('div');
      if (!parent) return;

      const existingMsg = $('.js-validation-msg', parent);
      const val = (input.value || '').trim();

      if (!val) {
        input.classList.add('border-red-400', 'bg-red-50/20');
        if (!existingMsg) {
          const msg = document.createElement('p');
          msg.className = 'js-validation-msg text-xs text-red-600 mt-1 font-medium flex items-center gap-1';
          msg.textContent = 'This field is required.';
          parent.appendChild(msg);
        }
      } else {
        input.classList.remove('border-red-400', 'bg-red-50/20');
        if (existingMsg) {
          existingMsg.remove();
        }
      }
    }

    function validateDateSequence(dateInput) {
      const form = dateInput.form;
      if (!form) return;

      const startDateInput = $('input[type="date"]:nth-of-type(1)', form) || form.elements['start_date'];
      const deadlineInput = $('input[type="date"]:nth-of-type(2)', form) || form.elements['deadline'];

      if (startDateInput && deadlineInput && startDateInput.value && deadlineInput.value) {
        const parent = deadlineInput.closest('div');
        if (!parent) return;

        let dateMsg = $('.js-date-sequence-msg', parent);
        if (deadlineInput.value < startDateInput.value) {
          deadlineInput.classList.add('border-red-400');
          if (!dateMsg) {
            dateMsg = document.createElement('p');
            dateMsg.className = 'js-date-sequence-msg text-xs text-red-600 mt-1 font-medium';
            dateMsg.textContent = 'Deadline cannot be earlier than start date.';
            parent.appendChild(dateMsg);
          }
        } else {
          deadlineInput.classList.remove('border-red-400');
          if (dateMsg) {
            dateMsg.remove();
          }
        }
      }
    }
  }

  // ==========================================================================
  // 3. LIVE CHARACTER COUNT FOR DESCRIPTIONS
  // ==========================================================================
  function initLiveCharacterCounters() {
    function attachCounterToTextarea(textarea) {
      if (textarea.dataset.hasCharCounter === 'true') return;
      textarea.dataset.hasCharCounter = 'true';

      const maxLen = parseInt(textarea.getAttribute('maxlength') || '500', 10);
      const parent = textarea.parentElement;
      if (!parent) return;

      const counter = document.createElement('div');
      counter.className = 'js-char-counter text-[11px] text-slate-400 font-medium text-right mt-1 select-none transition-colors';

      function updateCounter() {
        const len = (textarea.value || '').length;
        counter.textContent = len + ' / ' + maxLen + ' characters';

        if (len >= maxLen) {
          counter.className = 'js-char-counter text-[11px] text-red-600 font-bold text-right mt-1 select-none';
        } else if (len >= maxLen * 0.8) {
          counter.className = 'js-char-counter text-[11px] text-amber-600 font-semibold text-right mt-1 select-none';
        } else {
          counter.className = 'js-char-counter text-[11px] text-slate-400 font-medium text-right mt-1 select-none';
        }
      }

      parent.appendChild(counter);
      updateCounter();

      textarea.addEventListener('input', updateCounter);
    }

    // Attach to existing textareas
    $$('textarea').forEach(attachCounterToTextarea);

    // Observe newly opened modals or forms
    const observer = new MutationObserver(function () {
      $$('textarea').forEach(attachCounterToTextarea);
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  // ==========================================================================
  // 4. IMPROVED SEARCH & FILTER INTERACTIONS
  // ==========================================================================
  function initSearchFilterEnhancements() {
    // Keyboard shortcut '/' to quickly focus the search input
    document.addEventListener('keydown', function (e) {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        const searchInput = $('input[placeholder*="Search"]');
        if (searchInput) {
          e.preventDefault();
          searchInput.focus();
          searchInput.select();
        }
      }
    });

    // Escape inside search input clears it
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.activeElement && document.activeElement.matches('input[placeholder*="Search"]')) {
        const searchInput = document.activeElement;
        if (searchInput.value) {
          searchInput.value = '';
          // Dispatch input event so React / store reacts immediately
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
          searchInput.blur();
        }
      }
    });
  }

  // ==========================================================================
  // INITIALIZE ON DOM READY
  // ==========================================================================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initDeleteDialogEnhancements();
      initFormValidationFeedback();
      initLiveCharacterCounters();
      initSearchFilterEnhancements();
    });
  } else {
    initDeleteDialogEnhancements();
    initFormValidationFeedback();
    initLiveCharacterCounters();
    initSearchFilterEnhancements();
  }
})();
