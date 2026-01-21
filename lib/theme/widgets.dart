import 'package:flutter/material.dart';

import '../utils/formatters.dart';

/// Custom UI components for a modern, refined look.
///
/// These widgets provide a consistent design language across the app.

// ============================================================
// CONTENT CONTAINER
// ============================================================

/// A centered, max-width constrained container for responsive layouts.
/// Used to keep content readable on wide screens (tablets, web).
class ContentContainer extends StatelessWidget {
  final Widget child;
  final double maxWidth;

  const ContentContainer({super.key, required this.child, this.maxWidth = 600});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: maxWidth),
        child: child,
      ),
    );
  }
}

// ============================================================
// HEADER ICON BUTTON
// ============================================================

/// A consistent 44x44 icon button used in headers throughout the app.
class HeaderIconButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onTap;
  final Color? backgroundColor;
  final Color? iconColor;
  final bool isLoading;

  const HeaderIconButton({
    super.key,
    required this.icon,
    this.onTap,
    this.backgroundColor,
    this.iconColor,
    this.isLoading = false,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final bgColor = backgroundColor ?? colorScheme.surfaceContainerHighest;
    final fgColor = iconColor ?? colorScheme.onSurfaceVariant;

    return GestureDetector(
      onTap: isLoading ? null : onTap,
      child: Container(
        width: 44,
        height: 44,
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(14),
        ),
        child: isLoading
            ? Padding(
                padding: const EdgeInsets.all(12),
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: fgColor,
                ),
              )
            : Icon(icon, color: fgColor),
      ),
    );
  }
}

// ============================================================
// INPUT CARD
// ============================================================

/// A styled container for form inputs with consistent border and styling.
class InputCard extends StatelessWidget {
  final Widget child;

  const InputCard({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: colorScheme.outlineVariant.withValues(alpha: 0.5),
        ),
      ),
      child: child,
    );
  }
}

// ============================================================
// LOADING BUTTON
// ============================================================

/// A FilledButton.icon that shows a loading indicator when isLoading is true.
class LoadingButton extends StatelessWidget {
  final bool isLoading;
  final VoidCallback? onPressed;
  final IconData icon;
  final String label;
  final String? loadingLabel;

  const LoadingButton({
    super.key,
    required this.isLoading,
    required this.onPressed,
    required this.icon,
    required this.label,
    this.loadingLabel,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return FilledButton.icon(
      onPressed: isLoading ? null : onPressed,
      icon: isLoading
          ? SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: colorScheme.onPrimary,
              ),
            )
          : Icon(icon),
      label: Text(isLoading ? (loadingLabel ?? label) : label),
    );
  }
}

// ============================================================
// ACTION BUTTON
// ============================================================

/// A styled action button used for primary/secondary actions.
/// Used in quick action bars and bottom action bars.
class ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isPrimary;
  final VoidCallback onTap;

  const ActionButton({
    super.key,
    required this.icon,
    required this.label,
    required this.isPrimary,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final backgroundColor = isPrimary
        ? colorScheme.primary
        : colorScheme.surfaceContainerHighest;
    final foregroundColor = isPrimary
        ? colorScheme.onPrimary
        : colorScheme.onSurface;

    return Material(
      color: backgroundColor,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 20, color: foregroundColor),
              const SizedBox(width: 8),
              Text(
                label,
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  color: foregroundColor,
                  fontSize: 15,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ============================================================
// ACTION TILE
// ============================================================

class ActionTile extends StatelessWidget {
  final String title;
  final String? subtitle;
  final IconData icon;
  final Color? iconColor;
  final Color? titleColor;
  final Color? iconBackgroundColor;
  final VoidCallback? onTap;
  final Widget? trailing;
  final bool showChevron;
  final bool isDestructive;

  const ActionTile({
    super.key,
    required this.title,
    this.subtitle,
    required this.icon,
    this.iconColor,
    this.titleColor,
    this.iconBackgroundColor,
    this.onTap,
    this.trailing,
    this.showChevron = true,
    this.isDestructive = false,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final effectiveIconColor = isDestructive
        ? colorScheme.error
        : (iconColor ?? colorScheme.primary);
    final effectiveIconBgColor =
        iconBackgroundColor ?? effectiveIconColor.withValues(alpha: 0.1);
    final effectiveTitleColor = isDestructive
        ? colorScheme.error
        : (titleColor ?? colorScheme.onSurface);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: effectiveIconBgColor,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: effectiveIconColor, size: 22),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                        color: effectiveTitleColor,
                      ),
                    ),
                    if (subtitle != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        subtitle!,
                        style: TextStyle(
                          fontSize: 13,
                          color: colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              if (trailing != null) ...[
                const SizedBox(width: 12),
                trailing!,
              ] else if (showChevron && onTap != null) ...[
                Icon(
                  Icons.chevron_right_rounded,
                  color: colorScheme.onSurfaceVariant.withValues(alpha: 0.5),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

// ============================================================
// SECTION HEADER
// ============================================================

class SectionHeader extends StatelessWidget {
  final String title;
  final String? actionLabel;
  final VoidCallback? onAction;

  const SectionHeader({
    super.key,
    required this.title,
    this.actionLabel,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Padding(
      padding: const EdgeInsets.fromLTRB(4, 8, 4, 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            title,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: colorScheme.onSurfaceVariant,
              letterSpacing: 0.5,
            ),
          ),
          if (actionLabel != null && onAction != null)
            GestureDetector(
              onTap: onAction,
              child: Text(
                actionLabel!,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: colorScheme.primary,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

// ============================================================
// EMPTY STATE
// ============================================================

class EmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;
  final String? actionLabel;
  final VoidCallback? onAction;
  final String? secondaryActionLabel;
  final VoidCallback? onSecondaryAction;

  const EmptyState({
    super.key,
    required this.icon,
    required this.title,
    this.subtitle,
    this.actionLabel,
    this.onAction,
    this.secondaryActionLabel,
    this.onSecondaryAction,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                color: colorScheme.primary.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(
                icon,
                size: 48,
                color: colorScheme.primary.withValues(alpha: 0.7),
              ),
            ),
            const SizedBox(height: 28),
            Text(
              title,
              style: Theme.of(
                context,
              ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600),
              textAlign: TextAlign.center,
            ),
            if (subtitle != null) ...[
              const SizedBox(height: 8),
              Text(
                subtitle!,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: colorScheme.onSurfaceVariant,
                ),
                textAlign: TextAlign.center,
              ),
            ],
            if (actionLabel != null && onAction != null) ...[
              const SizedBox(height: 28),
              FilledButton.icon(
                onPressed: onAction,
                icon: const Icon(Icons.add_rounded, size: 20),
                label: Text(actionLabel!),
              ),
            ],
            if (secondaryActionLabel != null && onSecondaryAction != null) ...[
              const SizedBox(height: 12),
              TextButton(
                onPressed: onSecondaryAction,
                child: Text(secondaryActionLabel!),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// ============================================================
// AVATAR
// ============================================================

class UserAvatar extends StatelessWidget {
  final String name;
  final double size;
  final Color? backgroundColor;
  final Color? textColor;
  final bool isHighlighted;

  const UserAvatar({
    super.key,
    required this.name,
    this.size = 44,
    this.backgroundColor,
    this.textColor,
    this.isHighlighted = false,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final initial = name.isNotEmpty ? name[0].toUpperCase() : '?';

    // Use shared color generation function
    final generatedColor = getColorFromString(name, isDark: isDark);

    final bgColor =
        backgroundColor ??
        (isHighlighted
            ? colorScheme.primary
            : generatedColor.withValues(alpha: isDark ? 0.25 : 0.18));
    final fgColor =
        textColor ?? (isHighlighted ? colorScheme.onPrimary : generatedColor);

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(size * 0.3),
      ),
      child: Center(
        child: Text(
          initial,
          style: TextStyle(
            fontSize: size * 0.4,
            fontWeight: FontWeight.w600,
            color: fgColor,
          ),
        ),
      ),
    );
  }
}

// ============================================================
// AMOUNT BADGE
// ============================================================

class AmountBadge extends StatelessWidget {
  final String amount;
  final bool isPositive;
  final bool isNeutral;

  const AmountBadge({
    super.key,
    required this.amount,
    this.isPositive = false,
    this.isNeutral = false,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    Color textColor;
    Color bgColor;

    if (isNeutral) {
      textColor = colorScheme.onSurfaceVariant;
      bgColor = colorScheme.surfaceContainerHighest;
    } else if (isPositive) {
      textColor = const Color(0xFF059669);
      bgColor = const Color(0xFF059669).withValues(alpha: 0.1);
    } else {
      textColor = colorScheme.error;
      bgColor = colorScheme.error.withValues(alpha: 0.1);
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        amount,
        style: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: textColor,
        ),
      ),
    );
  }
}

// ============================================================
// SCREEN HEADER
// ============================================================

/// A consistent header with back button and title, optionally with actions.
class ScreenHeader extends StatelessWidget {
  final String title;
  final VoidCallback? onBack;
  final List<Widget>? actions;
  final IconData backIcon;

  const ScreenHeader({
    super.key,
    required this.title,
    this.onBack,
    this.actions,
    this.backIcon = Icons.arrow_back_rounded,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Row(
        children: [
          HeaderIconButton(
            icon: backIcon,
            onTap: onBack ?? () => Navigator.of(context).pop(),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Text(
              title,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          if (actions != null) ...actions!,
        ],
      ),
    );
  }
}

// ============================================================
// MESSAGE CARD
// ============================================================

/// A styled container for displaying error, info, or warning messages.
class MessageCard extends StatelessWidget {
  final String message;
  final MessageType type;

  const MessageCard({
    super.key,
    required this.message,
    this.type = MessageType.info,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    final Color color;
    final IconData icon;

    switch (type) {
      case MessageType.error:
        color = colorScheme.error;
        icon = Icons.error_outline_rounded;
        break;
      case MessageType.warning:
        color = Colors.orange;
        icon = Icons.warning_amber_rounded;
        break;
      case MessageType.info:
        color = colorScheme.primary;
        icon = Icons.info_outline_rounded;
        break;
      case MessageType.success:
        color = const Color(0xFF059669);
        icon = Icons.check_circle_outline_rounded;
        break;
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              message,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: color,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

enum MessageType { error, warning, info, success }

// ============================================================
// ICON CIRCLE
// ============================================================

/// A circular container with an icon, using primary color scheme.
class IconCircle extends StatelessWidget {
  final IconData icon;
  final double size;
  final double? iconSize;
  final Color? backgroundColor;
  final Color? iconColor;

  const IconCircle({
    super.key,
    required this.icon,
    this.size = 80,
    this.iconSize,
    this.backgroundColor,
    this.iconColor,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final effectiveIconSize = iconSize ?? size * 0.5;

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: backgroundColor ?? colorScheme.primary.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(size * 0.3),
      ),
      child: Icon(
        icon,
        size: effectiveIconSize,
        color: iconColor ?? colorScheme.primary,
      ),
    );
  }
}

// ============================================================
// BADGE PILL
// ============================================================

/// A small badge/pill container for displaying labels like currency codes.
class BadgePill extends StatelessWidget {
  final String label;
  final Color? backgroundColor;
  final Color? textColor;
  final double? fontSize;

  const BadgePill({
    super.key,
    required this.label,
    this.backgroundColor,
    this.textColor,
    this.fontSize,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: backgroundColor ?? colorScheme.secondaryContainer,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: fontSize ?? 12,
          fontWeight: FontWeight.w600,
          color: textColor ?? colorScheme.onSecondaryContainer,
        ),
      ),
    );
  }
}

// ============================================================
// LIST CARD
// ============================================================

/// A styled container for list items with border and rounded corners.
class ListCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final VoidCallback? onTap;

  const ListCard({
    super.key,
    required this.child,
    this.padding,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    final content = Container(
      padding: padding,
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: colorScheme.outlineVariant.withValues(alpha: 0.5),
        ),
      ),
      child: child,
    );

    if (onTap != null) {
      return Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: content,
        ),
      );
    }

    return content;
  }
}

// ============================================================
// BOTTOM SHEET HELPERS
// ============================================================

Future<T?> showAppBottomSheet<T>({
  required BuildContext context,
  required Widget Function(BuildContext) builder,
  bool isScrollControlled = true,
  bool isDismissible = true,
}) {
  return showModalBottomSheet<T>(
    context: context,
    isScrollControlled: isScrollControlled,
    isDismissible: isDismissible,
    showDragHandle: true,
    builder: (context) => Padding(
      padding: const EdgeInsets.only(top: 8),
      child: builder(context),
    ),
  );
}
