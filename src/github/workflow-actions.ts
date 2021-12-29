import { GitIdentity } from '.';
import { JobStep } from './workflows-model';

const GIT_PATCH_FILE = '.repo.patch';
const RUNNER_TEMP = '${{ runner.temp }}';

/**
 * A set of utility functions for creating GitHub actions in workflows.
 */
export class WorkflowActions {
  /**
   * Creates a .patch file from the current git diff and uploads it as an
   * artifact. Use `checkoutWithPatch` to download and apply in another job.
   *
   * @param options Options
   * @returns Job steps
   */
  public static createUploadGitPatch(options: WorkflowActionsCommonOptions = {}): JobStep[] {
    return [
      {
        if: options.if,
        name: 'Create Patch',
        run: [
          'git add .',
          `git diff --staged --patch > ${GIT_PATCH_FILE}`,
        ].join('\n'),
      },
      {
        if: options.if,
        name: 'Upload patch',
        uses: 'actions/upload-artifact@v2',
        with: { name: GIT_PATCH_FILE, path: GIT_PATCH_FILE },
      },
    ];
  }

  /**
   * Checks out a repository and applies a git patch that was created using
   * `createUploadGitPatch`.
   *
   * @param options Options
   * @returns Job steps
   */
  public static checkoutWithPatch(options: CheckoutWithPatchOptions = {}): JobStep[] {
    return [
      {
        name: 'Checkout',
        uses: 'actions/checkout@v2',
        with: {
          token: options.token,
          ref: options.ref,
          repository: options.repository,
        },
      },
      {
        if: options.if,
        name: 'Download patch',
        uses: 'actions/download-artifact@v2',
        with: { name: GIT_PATCH_FILE, path: RUNNER_TEMP },
      },
      {
        if: options.if,
        name: 'Apply patch',
        run: `[ -s ${RUNNER_TEMP}/${GIT_PATCH_FILE} ] && git apply ${RUNNER_TEMP}/${GIT_PATCH_FILE} || echo "Empty patch. Skipping."`,
      },
    ];
  }

  /**
   * Configures the git identity (user name and email).
   * @param id The identity to use
   * @returns Job steps
   */
  public static setGitIdentity(id: GitIdentity): JobStep[] {
    return [{
      name: 'Set git identity',
      run: [
        `git config user.name "${id.name}"`,
        `git config user.email "${id.email}"`,
      ].join('\n'),
    }];
  }
}

/**
 * Options for `checkoutWithPatch`.
 */
export interface CheckoutWithPatchOptions extends WorkflowActionsCommonOptions {
  /**
   * A GitHub token to use when checking out the repository.
   *
   * If the intent is to push changes back to the branch, then you must use a
   * PAT with `repo` (and possibly `workflows`) permissions.
   * @default - the default GITHUB_TOKEN is implicitly used
   */
  readonly token?: string;

  /**
   * Branch or tag name.
   * @default - the default branch is implicitly used
   */
  readonly ref?: string;

  /**
   * The repository (owner/repo) to use.
   * @default - the default repository is implicitly used
   */
  readonly repository?: string;
}

export interface WorkflowActionsCommonOptions {
  /**
   * Condition
   * @default - no condition
   */
  readonly if?: string;
}